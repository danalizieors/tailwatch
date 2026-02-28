import { v } from 'convex/values'
import { adjectives, nouns } from 'human-id'
import { mutation, query } from './_generated/server'
import { getAuthenticatedContext } from './functions'

const MAX_EVENTS_FOR_SNAPSHOT = 5_000
const DEFAULT_VOLUME = 'personal'
const DEFAULT_PERSONAL_VOLUME = 'personal'
const KEY_ADJECTIVES = adjectives
const KEY_NOUNS = nouns

type EventStatus = 'busy' | 'idle'

type VolumeDoc = {
  _id: any
  userId?: string
  name: string
  key?: string
  keyEnabled?: boolean
}

type PathDoc = {
  _id: any
  volumeId?: string
  path: string
}

type EventDoc = {
  _id: any
  _creationTime: number
  pathId?: string
  time: string
  status: EventStatus
  content?: string
}

function normalizeUserId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const next = value.trim()
  return next ? next : undefined
}

function normalizeVolumeScope(value?: string) {
  const next = value?.trim()
  return next || DEFAULT_VOLUME
}

function pickRandomItem(values: readonly string[]) {
  const index = Math.floor(Math.random() * values.length)
  return values[index] ?? values[0] ?? 'steady'
}

function singularizeNoun(value: string) {
  const word = value.toLowerCase()
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.endsWith('ches') || word.endsWith('shes') || word.endsWith('xes') || word.endsWith('zes') || word.endsWith('ses')) {
    return word.slice(0, -2)
  }
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

function generateHumanReadableKey() {
  const adjective = pickRandomItem(KEY_ADJECTIVES)
  const noun = singularizeNoun(pickRandomItem(KEY_NOUNS))
  const number = 10 + Math.floor(Math.random() * 90)
  return `${adjective}-${noun}-${number}`
}

async function generateUniqueVolumeKey(ctx: any) {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const value = generateHumanReadableKey()
    const existing = await ctx.db
      .query('volumes')
      .withIndex('by_key', (q: any) => q.eq('key', value))
      .first()
    if (!existing) return value
  }
  throw new Error('Failed to generate a unique key')
}

function normalizeTopicPath(value: string) {
  return value.replace(/^\/+|\/+$/g, '').replace(/\/+$/g, '').replace(/\/+/g, '/')
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

function normalizeEventStatus(input?: string): EventStatus {
  const normalized = input?.trim().toLowerCase()
  if (normalized === 'busy') return 'busy'
  return 'idle'
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

function docIngestedAt(doc: { _creationTime?: number }) {
  const ts = typeof doc._creationTime === 'number' ? doc._creationTime : Date.now()
  return new Date(ts).toISOString()
}

function toEntityCompat(row: any) {
  const segments = Array.isArray(row.segments) && row.segments.length > 0 ? row.segments : String(row.path ?? '').split('/').filter(Boolean)
  const entityId = segments[segments.length - 1] || row.path || 'path'
  return {
    key: row.key,
    volume: row.volume ?? DEFAULT_VOLUME,
    path: row.path,
    entityId,
    entityType: 'path',
    currentStatus: row.status,
    lastSeenAt: row.lastIngestedAt,
    lastContent: row.lastContent,
  }
}

async function resolveVolumeByName(ctx: any, volume: string, userId?: string) {
  const normalizedUserId = normalizeUserId(userId)
  const rows = await ctx.db
    .query('volumes')
    .withIndex('by_user_and_name', (q: any) => q.eq('userId', normalizedUserId).eq('name', volume))
    .collect()
  return (rows[0] ?? null) as VolumeDoc | null
}

async function ensureVolumeHasKey(ctx: any, volume: VolumeDoc) {
  const existingKey = typeof volume.key === 'string' ? volume.key.trim() : ''
  if (existingKey) return volume

  const key = await generateUniqueVolumeKey(ctx)
  await ctx.db.patch(volume._id, {
    key,
    keyEnabled: true,
  })
  const updated = (await ctx.db.get(volume._id)) as VolumeDoc | null
  if (!updated) {
    return {
      ...volume,
      key,
      keyEnabled: true,
    }
  }
  return updated
}

async function ensureVolumeExists(ctx: any, volume: string, userId?: string) {
  const normalizedUserId = normalizeUserId(userId)
  const existing = await resolveVolumeByName(ctx, volume, normalizedUserId)
  if (existing) return ensureVolumeHasKey(ctx, existing)

  const key = await generateUniqueVolumeKey(ctx)
  const id = await ctx.db.insert('volumes', {
    userId: normalizedUserId,
    name: volume,
    key,
    keyEnabled: true,
  })

  return {
    _id: id,
    userId: normalizedUserId,
    name: volume,
    key,
    keyEnabled: true,
  }
}

async function ensureDefaultPersonalVolumeForUser(ctx: any, userId?: string) {
  const normalizedUserId = normalizeUserId(userId)
  if (!normalizedUserId) return null
  return ensureVolumeExists(ctx, DEFAULT_PERSONAL_VOLUME, normalizedUserId)
}

async function ensurePathExists(ctx: any, volumeId: string, path: string) {
  const rows = await ctx.db
    .query('paths')
    .withIndex('by_volume', (q: any) => q.eq('volumeId', volumeId))
    .collect()
  const existing = rows.find((row: any) => row.path === path)
  if (existing) return existing

  const id = await ctx.db.insert('paths', {
    volumeId,
    path,
  })

  return {
    _id: id,
    volumeId,
    path,
  }
}

function mapEventDoc(doc: EventDoc, pathDoc: PathDoc, volume: string) {
  const time = String(doc.time ?? new Date().toISOString())
  const path = String(pathDoc.path ?? '')
  const segments = splitTopicPath(path)
  const ingestedAt = docIngestedAt(doc)

  return {
    id: String(doc._id),
    volume,
    path,
    segments,
    time,
    ingestedAt,
    status: doc.status,
    content: doc.content,
    pathId: doc.pathId ? String(doc.pathId) : undefined,
    submittedPath: undefined,
    entityId: segments[segments.length - 1] || path,
    entityType: 'path',
  }
}

function eventMatchesFilters(
  event: { path: string; status: EventStatus; content?: string },
  filters: { topicPrefix?: string; status?: string; q?: string },
) {
  if (!pathMatchesPrefix(event.path, filters.topicPrefix)) return false
  if (filters.status && filters.status !== 'all' && event.status !== filters.status) return false
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

async function loadVolumeContext(ctx: any, volumeRaw?: string, userId?: string) {
  const normalizedUserId = normalizeUserId(userId)
  const volume = normalizeVolumeScope(volumeRaw)
  const volumeDoc = await resolveVolumeByName(ctx, volume, normalizedUserId)
  if (!volumeDoc) {
    return {
      volume,
      volumeDoc: null,
      pathDocs: [] as PathDoc[],
      pathById: new Map<string, PathDoc>(),
      pathIds: new Set<string>(),
    }
  }

  const volumeId = String(volumeDoc._id)
  const pathDocs = (await ctx.db
    .query('paths')
    .withIndex('by_volume', (q: any) => q.eq('volumeId', volumeId))
    .collect()) as PathDoc[]
  const pathById = new Map(pathDocs.map((row) => [String(row._id), row]))
  const pathIds = new Set(pathDocs.map((row) => String(row._id)))

  return {
    volume,
    volumeDoc,
    pathDocs,
    pathById,
    pathIds,
  }
}

async function loadVolumeEvents(ctx: any, pathIds: Set<string>) {
  if (pathIds.size === 0) return [] as EventDoc[]
  const allEvents = (await ctx.db.query('events').collect()) as EventDoc[]
  return allEvents.filter((row) => row.pathId && pathIds.has(String(row.pathId)))
}

async function publishResolved(
  ctx: any,
  args: {
    volume?: string
    volumeId?: string
    path: string
    submittedPath?: string
    time?: string
    status?: string
    content?: string
  },
) {
  const authCtx = await getAuthenticatedContext(ctx)
  const userId = normalizeUserId(authCtx.userId ? String(authCtx.userId) : undefined)
  await ensureDefaultPersonalVolumeForUser(ctx, userId)

  const finalPath = normalizeTopicPath(args.path)
  const segments = splitTopicPath(finalPath)
  if (segments.length === 0) throw new Error('Path is required')

  let volumeDoc: any
  let volume: string

  if (args.volumeId) {
    volumeDoc = await ctx.db.get(args.volumeId)
    if (!volumeDoc) {
      throw new Error('Volume not found')
    }
    volume = String(args.volume ?? volumeDoc.name ?? DEFAULT_VOLUME)
  } else {
    volume = normalizeVolumeScope(args.volume)
    volumeDoc = await ensureVolumeExists(ctx, volume, userId)
  }

  const pathDoc = await ensurePathExists(ctx, String(volumeDoc._id), finalPath)

  const time = args.time ?? new Date().toISOString()
  const status = normalizeEventStatus(args.status)
  const content = args.content

  const insertedId = await ctx.db.insert('events', {
    pathId: String(pathDoc._id),
    time,
    status,
    content,
  })

  return {
    id: String(insertedId),
    volume,
    pathId: String(pathDoc._id),
    path: finalPath,
    segments,
    time,
    ingestedAt: new Date().toISOString(),
    status,
    content,
    submittedPath: args.submittedPath,
    entityId: segments[segments.length - 1] || finalPath,
    entityType: 'path',
  }
}

async function buildDashboardSnapshot(
  ctx: any,
  args: {
    userId?: string
    volume?: string
    topicPrefix?: string
    status?: string
    q?: string
    limit?: number
  },
) {
  const limit = Math.min(Math.max(args.limit ?? 200, 1), 500)
  const { volume, pathById, pathDocs, pathIds } = await loadVolumeContext(ctx, args.volume, args.userId)

  if (pathIds.size === 0) {
    return {
      events: [],
      paths: [],
      entities: [],
      topicTree: [],
      stats: {
        totalEvents: 0,
        pathCount: 0,
        busyCount: 0,
        idleCount: 0,
      },
      fetchedAt: new Date().toISOString(),
    }
  }

  const rawEvents = (await loadVolumeEvents(ctx, pathIds))
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, MAX_EVENTS_FOR_SNAPSHOT)

  const enriched = rawEvents
    .map((doc) => {
      const pathDoc = pathById.get(String(doc.pathId ?? ''))
      if (!pathDoc) return null
      return {
        doc,
        pathDoc,
        mapped: mapEventDoc(doc, pathDoc, volume),
      }
    })
    .filter((row): row is { doc: EventDoc; pathDoc: PathDoc; mapped: any } => row !== null)

  const filteredEventDocs = enriched
    .filter((row) =>
      eventMatchesFilters(
        {
          path: row.mapped.path,
          status: normalizeEventStatus(row.mapped.status),
          content: row.mapped.content,
        },
        args,
      ),
    )
    .map((row) => row.mapped)

  const events = filteredEventDocs
    .slice(0, limit)
    .sort((a: any, b: any) => String(b.time).localeCompare(String(a.time)) || String(b.ingestedAt).localeCompare(String(a.ingestedAt)))

  const latestByPathId = new Map<string, any>()
  for (const row of enriched) {
    const key = String(row.pathDoc._id)
    const current = latestByPathId.get(key)
    if (!current || row.doc._creationTime > current.doc._creationTime) {
      latestByPathId.set(key, row)
    }
  }

  const allPathRows = pathDocs
    .map((pathDoc) => {
      const latest = latestByPathId.get(String(pathDoc._id))
      const status = latest ? normalizeEventStatus(latest.mapped.status) : 'idle'
      const lastTime = latest ? String(latest.mapped.time) : ''
      const lastIngestedAt = latest ? String(latest.mapped.ingestedAt) : ''
      const lastContent = latest ? (latest.mapped.content as string | undefined) : undefined
      const segments = splitTopicPath(pathDoc.path)
      return {
        key: `${volume}::${pathDoc.path}`,
        volume,
        path: pathDoc.path,
        segments,
        status,
        lastTime,
        lastIngestedAt,
        lastContent,
      }
    })
    .filter((row) => row.lastIngestedAt)

  const paths = allPathRows
    .filter((row) => pathMatchesFilters(row, { topicPrefix: args.topicPrefix, status: args.status, q: args.q }))
    .sort((a, b) => {
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
    },
    fetchedAt: new Date().toISOString(),
  }
}

export const publish = mutation({
  args: {
    path: v.string(),
    volume: v.optional(v.string()),
    time: v.optional(v.string()),
    status: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return publishResolved(ctx, args)
  },
})

export const publishByKey = mutation({
  args: {
    key: v.string(),
    subpath: v.optional(v.string()),
    time: v.optional(v.string()),
    status: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const key = args.key.trim()
    if (!key) {
      throw new Error('Volume key is required')
    }

    const volume = (await ctx.db
      .query('volumes')
      .withIndex('by_key', (q: any) => q.eq('key', key))
      .first()) as VolumeDoc | null

    if (!volume || volume.keyEnabled === false) {
      throw new Error('Volume key not found')
    }

    const subpath = normalizeTopicPath(args.subpath ?? '')
    if (!subpath) {
      throw new Error('A path segment is required after the key')
    }

    return publishResolved(ctx, {
      volume: volume.name,
      volumeId: String(volume._id),
      path: subpath,
      submittedPath: subpath,
      time: args.time,
      status: args.status,
      content: args.content,
    })
  },
})

export const dashboardSnapshot = query({
  args: {
    volume: v.optional(v.string()),
    topicPrefix: v.optional(v.string()),
    status: v.optional(v.string()),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const userId = normalizeUserId(authCtx.userId ? String(authCtx.userId) : undefined)
    return buildDashboardSnapshot(ctx, {
      ...args,
      userId,
    })
  },
})

export const statusSnapshot = query({
  args: {
    volume: v.optional(v.string()),
    topicPrefix: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const userId = normalizeUserId(authCtx.userId ? String(authCtx.userId) : undefined)
    return buildDashboardSnapshot(ctx, {
      userId,
      volume: args.volume,
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
