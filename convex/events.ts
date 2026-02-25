// Kick convex watcher
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getAuthenticatedContext } from './functions'

const MAX_EVENTS_FOR_SNAPSHOT = 5_000

function normalizeTopicPath(value: string) {
  return value.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function splitTopicPath(value: string) {
  return normalizeTopicPath(value)
    .split('/')
    .filter(Boolean)
}

function deriveStatus(event: {
  type: string
  status?: string
  previous?: { currentStatus: string }
}) {
  if (event.type === 'start') return 'working'
  if (event.type === 'heartbeat') return event.previous?.currentStatus === 'error' ? 'error' : 'working'
  if (event.type === 'stop') return 'stopped'
  if (event.type === 'error') return 'error'
  if (event.type === 'status') {
    const normalized = event.status?.toLowerCase() || ''
    if (normalized === 'working' || normalized === 'running' || normalized === 'busy') return 'working'
    if (normalized === 'idle') return 'idle'
    if (normalized === 'error' || normalized === 'failed') return 'error'
    if (normalized === 'stopped' || normalized === 'success' || normalized === 'done') return 'stopped'
    return 'unknown'
  }
  return event.previous?.currentStatus || 'unknown'
}

function eventMatchesFilters(
  event: {
    path: string
    type: string
    content?: string
    entityId?: string
    runId?: string
  },
  filters: {
    topicPrefix?: string
    type?: string
    q?: string
  },
) {
  if (filters.topicPrefix) {
    const prefix = normalizeTopicPath(filters.topicPrefix)
    if (!event.path.startsWith(prefix)) return false
  }
  if (filters.type && filters.type !== 'all' && event.type !== filters.type) {
    return false
  }
  if (filters.q) {
    const q = filters.q.toLowerCase()
    const haystack = `${event.path} ${event.content ?? ''} ${event.entityId ?? ''} ${event.runId ?? ''}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

function statusRank(status: string) {
  switch (status) {
    case 'error':
      return 0
    case 'working':
      return 1
    case 'idle':
      return 2
    case 'stopped':
      return 3
    default:
      return 4
  }
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

function mapEventDoc(doc: any) {
  return {
    id: String(doc._id),
    workspace: doc.workspace ?? 'default',
    path: doc.path,
    segments: doc.segments,
    type: doc.type,
    timestamp: doc.timestamp,
    ingestedAt: doc.ingestedAt,
    runId: doc.runId,
    entityId: doc.entityId,
    entityType: doc.entityType,
    level: doc.level,
    status: doc.status,
    content: doc.content,
    meta: doc.meta,
    metrics: doc.metrics,
  }
}

function mapEntityStateDoc(doc: any, nowMs: number) {
  const currentStatus = String(doc.currentStatus ?? 'unknown')
  const isWorking = currentStatus === 'working'
  const startedAt = isWorking ? doc.startedAt : undefined
  const activeForMs =
    isWorking && typeof startedAt === 'string'
      ? Math.max(0, nowMs - new Date(startedAt).getTime())
      : undefined

  return {
    key: doc.key,
    workspace: doc.workspace ?? 'default',
    path: doc.path,
    entityId: doc.entityId,
    entityType: doc.entityType,
    currentStatus,
    currentRunId: doc.currentRunId,
    startedAt,
    lastSeenAt: doc.lastSeenAt,
    lastEventType: doc.lastEventType,
    lastContent: doc.lastContent,
    lastError: doc.lastError,
    activeForMs,
  }
}

async function buildDashboardSnapshot(
  ctx: any,
  args: {
    workspace?: string
    topicPrefix?: string
    type?: string
    q?: string
    limit?: number
  },
) {
  const workspace = args.workspace ?? 'default'
  const limit = Math.min(Math.max(args.limit ?? 200, 1), 500)

  const rawEvents = await ctx.db
    .query('events')
    .withIndex('by_workspace_timestamp', (q: any) => q.eq('workspace', workspace))
    .order('desc')
    .take(MAX_EVENTS_FOR_SNAPSHOT)

  const filteredEventDocs = rawEvents.filter((doc: any) =>
    eventMatchesFilters(
      {
        path: doc.path,
        type: doc.type,
        content: doc.content,
        entityId: doc.entityId,
        runId: doc.runId,
      },
      args,
    ),
  )

  const events = filteredEventDocs.slice(0, limit).map(mapEventDoc)

  const allEntityDocs = await ctx.db
    .query('entity_state')
    .withIndex('by_workspace', (q: any) => q.eq('workspace', workspace))
    .collect()

  const nowMs = Date.now()
  const entities = allEntityDocs
    .filter((doc: any) =>
      args.topicPrefix ? doc.path.startsWith(normalizeTopicPath(args.topicPrefix)) : true,
    )
    .map((doc: any) => mapEntityStateDoc(doc, nowMs))
    .sort((a: any, b: any) => {
      const rankDelta = statusRank(a.currentStatus) - statusRank(b.currentStatus)
      if (rankDelta !== 0) return rankDelta
      return String(b.lastSeenAt).localeCompare(String(a.lastSeenAt))
    })

  const topicTree = buildTopicTree(filteredEventDocs.map((doc: any) => ({ segments: doc.segments })))

  return {
    events,
    entities,
    topicTree,
    stats: {
      totalEvents: filteredEventDocs.length,
      entityCount: entities.length,
      activeCount: entities.filter((row: any) => row.currentStatus === 'working').length,
      errorCount: entities.filter((row: any) => row.currentStatus === 'error').length,
    },
    fetchedAt: new Date().toISOString(),
  }
}

export const publish = mutation({
  args: {
    path: v.string(),
    workspace: v.optional(v.string()),
    type: v.union(
      v.literal('start'),
      v.literal('log'),
      v.literal('stop'),
      v.literal('error'),
      v.literal('heartbeat'),
      v.literal('status'),
    ),
    timestamp: v.optional(v.string()),
    runId: v.optional(v.string()),
    entityId: v.optional(v.string()),
    entityType: v.optional(v.string()),
    level: v.optional(v.string()),
    status: v.optional(v.string()),
    content: v.optional(v.string()),
    meta: v.optional(v.any()),
    metrics: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const rawSegments = splitTopicPath(args.path)
    if (rawSegments.length === 0) throw new Error('Path is required')

    const finalPath = normalizeTopicPath(args.path)
    const workspace = args.workspace ?? 'default'

    const timestamp = args.timestamp ?? new Date().toISOString()
    const ingestedAt = new Date().toISOString()

    const insertedId = await ctx.db.insert('events', {
      ...args,
      workspace,
      path: finalPath,
      segments: splitTopicPath(finalPath),
      timestamp,
      ingestedAt,
    })

    const entityId = args.entityId ?? args.runId ?? finalPath
    const entityType = args.entityType ?? (args.runId ? 'run' : args.entityId ? 'entity' : 'topic')
    const key = `${finalPath}::${entityId}`
    const existing = await ctx.db
      .query('entity_state')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first()

    const currentStatus = deriveStatus({
      type: args.type,
      status: args.status,
      previous: existing ? { currentStatus: existing.currentStatus } : undefined,
    })

    const patch = {
      workspace,
      key,
      path: finalPath,
      entityId,
      entityType,
      currentStatus,
      currentRunId: args.runId ?? existing?.currentRunId,
      startedAt: args.type === 'start' ? timestamp : currentStatus === 'working' ? existing?.startedAt ?? timestamp : undefined,
      lastSeenAt: timestamp,
      lastEventType: args.type,
      lastContent: args.content ?? existing?.lastContent,
      lastError: args.type === 'error' ? args.content ?? 'Error' : existing?.lastError,
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
    } else {
      await ctx.db.insert('entity_state', patch)
    }

    return {
      id: String(insertedId),
      path: finalPath,
      segments: splitTopicPath(finalPath),
      type: args.type,
      timestamp,
      ingestedAt,
      runId: args.runId,
      entityId: args.entityId,
      entityType: args.entityType,
      level: args.level,
      status: args.status,
      content: args.content,
      meta: args.meta,
      metrics: args.metrics,
    }
  },
})

export const listRecentEvents = query({
  args: {
    limit: v.optional(v.number()),
    topicPrefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500)
    const rows = await ctx.db.query('events').withIndex('by_timestamp').order('desc').take(limit * 3)
    return rows
      .filter((row) => (args.topicPrefix ? row.path.startsWith(normalizeTopicPath(args.topicPrefix)) : true))
      .slice(0, limit)
  },
})

export const listEntityState = query({
  args: {
    topicPrefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    const rows = await ctx.db.query('entity_state').collect()
    return rows
      .filter((row) => (args.topicPrefix ? row.path.startsWith(normalizeTopicPath(args.topicPrefix)) : true))
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
  },
})

export const dashboardSnapshot = query({
  args: {
    workspace: v.optional(v.string()),
    topicPrefix: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    return buildDashboardSnapshot(ctx, {
      workspace: args.workspace,
      topicPrefix: args.topicPrefix,
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
    const entities = await ctx.db.query('entity_state').collect()
    for (const doc of entities) {
      await ctx.db.delete(doc._id)
    }
    return { success: true, deletedEvents: events.length, deletedEntities: entities.length }
  },
})
