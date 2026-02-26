import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getAuthenticatedContext } from './functions'

const MAX_EVENTS_FOR_SNAPSHOT = 5_000
const DEFAULT_VOLUME = 'default'

type EventStatus = 'busy' | 'idle'

function normalizeWorkspace(value?: string) {
  const next = value?.trim()
  return next || DEFAULT_VOLUME
}

function normalizeTopicPath(value: string) {
  return value.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function splitTopicPath(value: string) {
  const clean = normalizeTopicPath(value)
  const segments = clean.split('/').filter(Boolean)
  for (const segment of segments) {
    if (segment === '.' || segment === '..') throw new Error('Invalid path segment')
  }
  return segments
}

function pathMatchesPrefix(pathValue: string, topicPrefix?: string) {
  if (!topicPrefix) return true
  const prefix = normalizeTopicPath(topicPrefix)
  if (!prefix) return true
  return pathValue === prefix || pathValue.startsWith(`${prefix}/`)
}

function normalizeEventStatus(input?: string, legacyType?: string): EventStatus {
  const normalized = input?.trim().toLowerCase()
  if (normalized === 'busy') return 'busy'
  if (normalized === 'idle') return 'idle'

  if (normalized) {
    if (['error', 'failed', 'fail', 'warn', 'warning', 'needs_attention', 'action_required', 'alert'].includes(normalized)) {
      return 'busy'
    }
    if (['ok', 'clear', 'success', 'done', 'stopped', 'passive', 'working', 'running'].includes(normalized)) {
      return 'idle'
    }
  }

  const legacy = legacyType?.trim().toLowerCase()
  if (legacy === 'error') return 'busy'
  return 'idle'
}

function legacyTypeMatchesStatus(status: EventStatus, type?: string) {
  if (!type || type === 'all') return true
  const normalized = type.toLowerCase()
  if (normalized === 'status') return true
  if (normalized === 'error') return status === 'busy'
  return status === 'idle'
}

function pathStatusRank(status: EventStatus) {
  switch (status) {
    case 'busy':
      return 0
    case 'idle':
      return 1
    default:
      return 2
  }
}

function toEntityCompat(row: any) {
  const segments = Array.isArray(row.segments) && row.segments.length > 0 ? row.segments : String(row.path ?? '').split('/').filter(Boolean)
  const entityId = segments[segments.length - 1] || row.path || 'path'
  return {
    key: row.key,
    workspace: row.workspace ?? DEFAULT_VOLUME,
    path: row.path,
    entityId,
    entityType: 'path',
    currentStatus: row.status,
    lastSeenAt: row.lastIngestedAt,
    lastEventType: 'status',
    lastContent: row.lastContent,
  }
}

function hashWriteKey(value: string) {
  // Non-cryptographic stable hash for lookup keys; replace with a stronger hash when bindings CRUD is added.
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a_${(hash >>> 0).toString(16)}`
}

async function ensureVolumeExists(ctx: any, workspace: string, userId?: string) {
  const existing = await ctx.db
    .query('volumes')
    .withIndex('by_slug', (q: any) => q.eq('slug', workspace))
    .first()

  if (existing) return existing

  const now = new Date().toISOString()
  const id = await ctx.db.insert('volumes', {
    slug: workspace,
    name: workspace,
    ownerUserId: userId,
    createdAt: now,
    updatedAt: now,
  })

  return {
    _id: id,
    slug: workspace,
    name: workspace,
    ownerUserId: userId,
    createdAt: now,
    updatedAt: now,
  }
}

function mapEventDoc(doc: any) {
  const time = String(doc.time ?? doc.timestamp ?? new Date().toISOString())
  return {
    id: String(doc._id),
    workspace: doc.workspace ?? DEFAULT_VOLUME,
    path: doc.path,
    segments: doc.segments,
    time,
    timestamp: time,
    ingestedAt: String(doc.ingestedAt ?? time),
    status: doc.status,
    content: doc.content,
    pathId: doc.pathId,
    submittedPath: doc.submittedPath,
    type: 'status',
    entityId: Array.isArray(doc.segments) && doc.segments.length > 0 ? doc.segments[doc.segments.length - 1] : doc.path,
    entityType: 'path',
  }
}

function mapPathDoc(doc: any) {
  return {
    key: doc.key,
    workspace: doc.workspace ?? DEFAULT_VOLUME,
    path: doc.path,
    segments: doc.segments,
    status: doc.status,
    lastTime: doc.lastTime,
    lastIngestedAt: doc.lastIngestedAt,
    lastSeenAt: doc.lastIngestedAt,
    lastContent: doc.lastContent,
  }
}

function eventMatchesFilters(
  event: { path: string; status: EventStatus; content?: string },
  filters: { topicPrefix?: string; status?: string; type?: string; q?: string },
) {
  if (!pathMatchesPrefix(event.path, filters.topicPrefix)) return false
  if (filters.status && filters.status !== 'all' && event.status !== filters.status) return false
  if (!legacyTypeMatchesStatus(event.status, filters.type)) return false
  if (filters.q) {
    const q = filters.q.toLowerCase()
    const haystack = `${event.path} ${event.content ?? ''}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

function pathMatchesFilters(
  row: { path: string; status: EventStatus; lastContent?: string },
  filters: { topicPrefix?: string; status?: string; q?: string },
) {
  if (!pathMatchesPrefix(row.path, filters.topicPrefix)) return false
  if (filters.status && filters.status !== 'all' && row.status !== filters.status) return false
  if (filters.q) {
    const q = filters.q.toLowerCase()
    const haystack = `${row.path} ${row.lastContent ?? ''}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

function buildTopicTree(events: Array<{ segments: string[] }>) {
  type TopicNode = {
    id: string
    name: string
    path: string
    count: number
    children: TopicNode[]
    childrenMap: Map<string, TopicNode>
  }

  const root: TopicNode = {
    id: 'root',
    name: 'root',
    path: '',
    count: 0,
    children: [],
    childrenMap: new Map(),
  }

  for (const event of events) {
    root.count += 1
    let cursor = root
    let partial = ''
    for (const segment of event.segments) {
      partial = partial ? `${partial}/${segment}` : segment
      let child = cursor.childrenMap.get(segment)
      if (!child) {
        child = {
          id: partial,
          name: segment,
          path: partial,
          count: 0,
          children: [],
          childrenMap: new Map(),
        }
        cursor.childrenMap.set(segment, child)
        cursor.children.push(child)
      }
      child.count += 1
      cursor = child
    }
  }

  const finalize = (nodes: TopicNode[]): any[] =>
    nodes
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map(({ childrenMap: _childrenMap, children, ...rest }) => ({
        ...rest,
        children: finalize(children),
      }))

  return finalize(root.children)
}

async function upsertPathState(
  ctx: any,
  input: {
    workspace: string
    path: string
    segments: string[]
    status: EventStatus
    time: string
    ingestedAt: string
    content?: string
    userId?: string
  },
) {
  const existing = await ctx.db
    .query('paths')
    .withIndex('by_workspace_path', (q: any) => q.eq('workspace', input.workspace).eq('path', input.path))
    .first()

  const patch = {
    workspace: input.workspace,
    key: `${input.workspace}::${input.path}`,
    path: input.path,
    segments: input.segments,
    status: input.status,
    lastTime: input.time,
    lastIngestedAt: input.ingestedAt,
    lastContent: input.content,
    userId: input.userId,
  }

  if (existing) {
    await ctx.db.patch(existing._id, patch)
    return { id: String(existing._id), doc: { ...existing, ...patch } }
  }

  const inserted = await ctx.db.insert('paths', patch)
  return { id: String(inserted), doc: { ...patch, _id: inserted } }
}

async function publishResolved(
  ctx: any,
  args: {
    workspace?: string
    path: string
    submittedPath?: string
    time?: string
    timestamp?: string
    status?: string
    type?: string
    content?: string
    message?: string
  },
) {
  const authCtx = await getAuthenticatedContext(ctx)
  const userId = authCtx.userId ? String(authCtx.userId) : undefined

  const finalPath = normalizeTopicPath(args.path)
  const segments = splitTopicPath(finalPath)
  if (segments.length === 0) throw new Error('Path is required')

  const workspace = normalizeWorkspace(args.workspace)
  await ensureVolumeExists(ctx, workspace, userId)

  const time = args.time ?? args.timestamp ?? new Date().toISOString()
  const ingestedAt = new Date().toISOString()
  const status = normalizeEventStatus(args.status, args.type)
  const content = args.content ?? args.message

  const pathState = await upsertPathState(ctx, {
    workspace,
    path: finalPath,
    segments,
    status,
    time,
    ingestedAt,
    content,
    userId,
  })

  const insertedId = await ctx.db.insert('events', {
    workspace,
    pathId: pathState.id,
    path: finalPath,
    segments,
    time,
    ingestedAt,
    status,
    content,
    submittedPath: args.submittedPath,
    userId,
  })

  return {
    id: String(insertedId),
    workspace,
    pathId: pathState.id,
    path: finalPath,
    segments,
    time,
    timestamp: time,
    ingestedAt,
    status,
    content,
    submittedPath: args.submittedPath,
    type: 'status',
    entityId: segments[segments.length - 1] || finalPath,
    entityType: 'path',
  }
}

async function buildDashboardSnapshot(
  ctx: any,
  args: {
    workspace?: string
    topicPrefix?: string
    status?: string
    type?: string
    q?: string
    limit?: number
  },
) {
  const workspace = normalizeWorkspace(args.workspace)
  const limit = Math.min(Math.max(args.limit ?? 200, 1), 500)

  const rawEvents = await ctx.db
    .query('events')
    .withIndex('by_workspace_ingestedAt', (q: any) => q.eq('workspace', workspace))
    .order('desc')
    .take(MAX_EVENTS_FOR_SNAPSHOT)

  const filteredEventDocs = rawEvents.filter((doc: any) =>
    eventMatchesFilters(
      {
        path: doc.path,
        status: normalizeEventStatus(doc.status),
        content: doc.content,
      },
      args,
    ),
  )

  const events = filteredEventDocs
    .slice(0, limit)
    .map(mapEventDoc)
    .sort((a: any, b: any) => String(b.time).localeCompare(String(a.time)) || String(b.ingestedAt).localeCompare(String(a.ingestedAt)))

  const allPathDocs = await ctx.db
    .query('paths')
    .withIndex('by_workspace', (q: any) => q.eq('workspace', workspace))
    .collect()

  const paths = allPathDocs
    .map(mapPathDoc)
    .filter((row: any) => pathMatchesFilters(row, { topicPrefix: args.topicPrefix, status: args.status, q: args.q }))
    .sort((a: any, b: any) => {
      const rank = pathStatusRank(a.status) - pathStatusRank(b.status)
      if (rank !== 0) return rank
      return String(b.lastIngestedAt).localeCompare(String(a.lastIngestedAt))
    })

  const topicTree = buildTopicTree(filteredEventDocs.map((doc: any) => ({ segments: doc.segments })))
  const busyCount = paths.filter((row: any) => row.status === 'busy').length
  const idleCount = paths.filter((row: any) => row.status === 'idle').length
  const entities = paths.map(toEntityCompat)

  return {
    events,
    paths,
    entities,
    topicTree,
    stats: {
      totalEvents: filteredEventDocs.length,
      pathCount: paths.length,
      busyCount,
      idleCount,
      entityCount: paths.length,
      activeCount: busyCount,
      errorCount: 0,
    },
    fetchedAt: new Date().toISOString(),
  }
}

export const publish = mutation({
  args: {
    path: v.string(),
    workspace: v.optional(v.string()),
    time: v.optional(v.string()),
    timestamp: v.optional(v.string()),
    status: v.optional(v.string()),
    content: v.optional(v.string()),
    message: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return publishResolved(ctx, args)
  },
})

export const publishByKey = mutation({
  args: {
    key: v.string(),
    subpath: v.optional(v.string()),
    workspace: v.optional(v.string()),
    time: v.optional(v.string()),
    timestamp: v.optional(v.string()),
    status: v.optional(v.string()),
    content: v.optional(v.string()),
    message: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const keyHash = hashWriteKey(args.key)
    const binding = await ctx.db
      .query('bindings')
      .withIndex('by_key_hash', (q: any) => q.eq('keyHash', keyHash))
      .first()

    if (!binding || binding.enabled === false) {
      throw new Error('Binding key not found')
    }

    const suffix = normalizeTopicPath(args.subpath ?? '')
    const base = normalizeTopicPath(binding.targetPath)
    const path = suffix ? `${base}/${suffix}` : base

    return publishResolved(ctx, {
      workspace: args.workspace ?? binding.workspace,
      path,
      submittedPath: suffix || undefined,
      time: args.time,
      timestamp: args.timestamp,
      status: args.status,
      content: args.content,
      message: args.message,
      type: args.type,
    })
  },
})

export const listRecentEvents = query({
  args: {
    limit: v.optional(v.number()),
    topicPrefix: v.optional(v.string()),
    workspace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    const workspace = normalizeWorkspace(args.workspace)
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500)
    const rows = await ctx.db
      .query('events')
      .withIndex('by_workspace_ingestedAt', (q: any) => q.eq('workspace', workspace))
      .order('desc')
      .take(limit * 3)

    return rows
      .filter((row: any) => pathMatchesPrefix(row.path, args.topicPrefix))
      .slice(0, limit)
      .map(mapEventDoc)
  },
})

export const listPaths = query({
  args: {
    topicPrefix: v.optional(v.string()),
    workspace: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    const workspace = normalizeWorkspace(args.workspace)
    const rows = await ctx.db
      .query('paths')
      .withIndex('by_workspace', (q: any) => q.eq('workspace', workspace))
      .collect()

    return rows
      .map(mapPathDoc)
      .filter((row: any) => pathMatchesFilters(row, { topicPrefix: args.topicPrefix, status: args.status }))
      .sort((a: any, b: any) => String(b.lastIngestedAt).localeCompare(String(a.lastIngestedAt)))
  },
})

// Legacy alias retained while UI/backend callers are migrated.
export const listEntityState = listPaths

export const dashboardSnapshot = query({
  args: {
    workspace: v.optional(v.string()),
    topicPrefix: v.optional(v.string()),
    status: v.optional(v.string()),
    type: v.optional(v.string()),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    return buildDashboardSnapshot(ctx, args)
  },
})

export const statusSnapshot = query({
  args: {
    workspace: v.optional(v.string()),
    topicPrefix: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    return buildDashboardSnapshot(ctx, {
      workspace: args.workspace,
      topicPrefix: args.topicPrefix,
      status: args.status,
      limit: 200,
    })
  },
})

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedContext(ctx)

    const events = await ctx.db.query('events').collect()
    for (const doc of events) {
      await ctx.db.delete(doc._id)
    }

    const paths = await ctx.db.query('paths').collect()
    for (const doc of paths) {
      await ctx.db.delete(doc._id)
    }

    return { success: true, deletedEvents: events.length, deletedEntities: paths.length }
  },
})
