import { adjectives, nouns } from 'human-id'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

const DEFAULT_VOLUME = 'personal'

function normalizeVolume(value?: string) {
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

function normalizeEventStatus(input?: string) {
  const normalized = input?.trim().toLowerCase()
  return normalized === 'busy' ? 'busy' : 'idle'
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
  const adjective = pickRandomItem(adjectives)
  const noun = singularizeNoun(pickRandomItem(nouns))
  const number = 10 + Math.floor(Math.random() * 90)
  return `${adjective}-${noun}-${number}`
}

async function generateUniqueVolumeKey(ctx: any) {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const candidate = generateHumanReadableKey()
    const existing = await ctx.db
      .query('volumes')
      .withIndex('by_key', (q: any) => q.eq('key', candidate))
      .first()
    if (!existing) return candidate
  }
  throw new Error('Failed to generate a unique volume key')
}

async function ensureVolumeExists(ctx: any, volumeName: string) {
  const existing = await ctx.db
    .query('volumes')
    .withIndex('by_user_and_name', (q: any) => q.eq('userId', undefined).eq('name', volumeName))
    .first()
  if (existing) return existing

  const key = await generateUniqueVolumeKey(ctx)
  const volumeId = await ctx.db.insert('volumes', {
    userId: undefined,
    name: volumeName,
    key,
    keyEnabled: true,
  })
  const created = await ctx.db.get(volumeId)
  if (!created) throw new Error('Failed to create volume')
  return created
}

async function ensurePathExists(ctx: any, volumeId: string, path: string) {
  const existing = await ctx.db
    .query('paths')
    .withIndex('by_volumeId_and_path', (q: any) => q.eq('volumeId', volumeId).eq('path', path))
    .first()
  if (existing) return existing

  const pathId = await ctx.db.insert('paths', {
    volumeId,
    path,
  })
  const created = await ctx.db.get(pathId)
  if (!created) throw new Error('Failed to create path')
  return created
}

async function publishResolved(
  ctx: any,
  input: {
    volume?: string
    volumeId?: string
    path: string
    submittedPath?: string
    time?: string
    status?: string
    content?: string
  },
) {
  const finalPath = normalizeTopicPath(input.path)
  const segments = splitTopicPath(finalPath)
  if (segments.length === 0) throw new Error('Path is required')

  let volumeDoc
  let volumeName: string

  if (input.volumeId) {
    const found = await ctx.db.get(input.volumeId)
    if (!found) throw new Error('Volume not found')
    volumeDoc = found
    volumeName = String(input.volume ?? found.name ?? DEFAULT_VOLUME)
  } else {
    volumeName = normalizeVolume(input.volume)
    volumeDoc = await ensureVolumeExists(ctx, volumeName)
  }

  const pathDoc = await ensurePathExists(ctx, String(volumeDoc._id), finalPath)
  const status = normalizeEventStatus(input.status)
  const time = input.time ?? new Date().toISOString()

  const insertedId = await ctx.db.insert('events', {
    pathId: String(pathDoc._id),
    time,
    status,
    content: input.content,
  })

  return {
    id: String(insertedId),
    volume: volumeName,
    path: finalPath,
    segments,
    time,
    ingestedAt: new Date().toISOString(),
    status,
    content: input.content,
    pathId: String(pathDoc._id),
    submittedPath: input.submittedPath,
    entityId: segments[segments.length - 1] || finalPath,
    entityType: 'path',
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
    const key = args.key.trim()
    if (!key) throw new Error('Volume key is required')

    const volume = await ctx.db
      .query('volumes')
      .withIndex('by_key', (q: any) => q.eq('key', key))
      .first()

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

function pathMatchesPrefix(pathValue: string, topicPrefix?: string) {
  if (!topicPrefix) return true
  const prefix = normalizeTopicPath(topicPrefix)
  if (!prefix) return true
  return pathValue === prefix || pathValue.startsWith(`${prefix}/`)
}

function statusRank(status: 'busy' | 'idle') {
  return status === 'busy' ? 0 : 1
}

function normalizeQueryStatus(value?: string) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized || normalized === 'all') return undefined
  if (normalized === 'busy' || normalized === 'idle') return normalized
  return undefined
}

function toDashboardSnapshot(input: {
  events: Array<{
    id: string
    volume: string
    path: string
    segments: string[]
    time: string
    ingestedAt: string
    status: 'busy' | 'idle'
    content?: string
    pathId: string
    entityId: string
    entityType: 'path'
  }>
  topicTreeEvents: Array<{
    segments: string[]
  }>
  paths: Array<{
    key: string
    volume: string
    path: string
    segments: string[]
    status: 'busy' | 'idle'
    lastTime: string
    lastIngestedAt: string
    lastContent?: string
  }>
  totalEvents: number
}) {
  type MutableNode = {
    id: string
    name: string
    path: string
    count: number
    children: MutableNode[]
    childrenMap: Map<string, MutableNode>
  }

  type TopicTreeNode = {
    id: string
    name: string
    path: string
    count: number
    children: TopicTreeNode[]
  }

  const root: MutableNode = {
    id: 'root',
    name: 'root',
    path: '',
    count: 0,
    children: [],
    childrenMap: new Map(),
  }

  for (const event of input.topicTreeEvents) {
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

  const finalizeNodes = (nodes: MutableNode[]): TopicTreeNode[] =>
    nodes
      .slice()
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
      .map((node) => ({
        id: node.id,
        name: node.name,
        path: node.path,
        count: node.count,
        children: finalizeNodes(node.children),
      }))

  const entities = input.paths.map((row) => {
    const segments = row.segments.length > 0 ? row.segments : row.path.split('/').filter(Boolean)
    const entityId = segments[segments.length - 1] || row.path || 'path'
    return {
      key: row.key,
      volume: row.volume,
      path: row.path,
      entityId,
      entityType: 'path',
      currentStatus: row.status,
      lastSeenAt: row.lastIngestedAt,
      lastContent: row.lastContent,
    }
  })

  const busyCount = input.paths.filter((row) => row.status === 'busy').length
  const idleCount = input.paths.filter((row) => row.status === 'idle').length

  return {
    events: input.events,
    paths: input.paths,
    entities,
    topicTree: finalizeNodes(root.children),
    stats: {
      totalEvents: input.totalEvents,
      pathCount: input.paths.length,
      busyCount,
      idleCount,
    },
    fetchedAt: new Date().toISOString(),
  }
}

async function buildSnapshot(
  ctx: any,
  input: {
    userId?: string
    volume?: string
    topicPrefix?: string
    status?: string
    q?: string
    limit?: number
  },
) {
  const volumeName = normalizeVolume(input.volume)
  const statusFilter = normalizeQueryStatus(input.status)
  const topicPrefix = normalizeTopicPath(input.topicPrefix ?? '')
  const q = input.q?.trim().toLowerCase()
  const limit = Math.min(Math.max(Number(input.limit ?? 200), 1), 500)

  const volumeCandidates: any[] = []
  const userId = typeof input.userId === 'string' && input.userId.trim().length > 0 ? input.userId.trim() : undefined

  if (userId) {
    const userVolumes = await ctx.db
      .query('volumes')
      .withIndex('by_user_and_name', (queryBuilder: any) => queryBuilder.eq('userId', userId).eq('name', volumeName))
      .collect()
    volumeCandidates.push(...userVolumes)
  }

  const globalVolumes = await ctx.db
    .query('volumes')
    .withIndex('by_user_and_name', (queryBuilder: any) => queryBuilder.eq('userId', undefined).eq('name', volumeName))
    .collect()
  volumeCandidates.push(...globalVolumes)

  const seenVolumeIds = new Set<string>()
  const volumeRows = volumeCandidates.filter((volume) => {
    const id = String(volume._id)
    if (seenVolumeIds.has(id)) return false
    seenVolumeIds.add(id)
    return true
  })

  if (volumeRows.length === 0) {
    return toDashboardSnapshot({
      events: [],
      topicTreeEvents: [],
      paths: [],
      totalEvents: 0,
    })
  }

  const events: Array<{
    id: string
    volume: string
    path: string
    segments: string[]
    time: string
    ingestedAt: string
    status: 'busy' | 'idle'
    content?: string
    pathId: string
    entityId: string
    entityType: 'path'
  }> = []

  const paths: Array<{
    key: string
    volume: string
    path: string
    segments: string[]
    status: 'busy' | 'idle'
    lastTime: string
    lastIngestedAt: string
    lastContent?: string
  }> = []

  for (const volume of volumeRows) {
    const candidateVolumeName = normalizeVolume(typeof volume.name === 'string' ? volume.name : volumeName)
    const pathRows = await ctx.db
      .query('paths')
      .withIndex('by_volumeId', (queryBuilder: any) => queryBuilder.eq('volumeId', String(volume._id)))
      .collect()

    for (const pathRow of pathRows) {
      const pathValue = normalizeTopicPath(String(pathRow.path ?? ''))
      if (!pathValue) continue
      if (!pathMatchesPrefix(pathValue, topicPrefix)) continue

      const pathEvents = await ctx.db
        .query('events')
        .withIndex('by_pathId', (queryBuilder: any) => queryBuilder.eq('pathId', String(pathRow._id)))
        .collect()

      if (pathEvents.length === 0) continue

      const normalizedEvents: Array<{
        id: string
        volume: string
        path: string
        segments: string[]
        time: string
        ingestedAt: string
        status: 'busy' | 'idle'
        content?: string
        pathId: string
        entityId: string
        entityType: 'path'
      }> = pathEvents
        .map((eventRow: any) => {
          const time = typeof eventRow.time === 'string' ? eventRow.time : new Date(eventRow._creationTime ?? Date.now()).toISOString()
          const ingestedAt = new Date(eventRow._creationTime ?? Date.now()).toISOString()
          const status = eventRow.status === 'busy' ? 'busy' : 'idle'
          const content = typeof eventRow.content === 'string' ? eventRow.content : undefined
          const segments = splitTopicPath(pathValue)
          const entityId = segments[segments.length - 1] || pathValue

          return {
            id: String(eventRow._id),
            volume: candidateVolumeName,
            path: pathValue,
            segments,
            time,
            ingestedAt,
            status,
            content,
            pathId: String(pathRow._id),
            entityId,
            entityType: 'path' as const,
          }
        })
        .sort((left: { time: string; ingestedAt: string }, right: { time: string; ingestedAt: string }) => {
          const byTime = right.time.localeCompare(left.time)
          if (byTime !== 0) return byTime
          return right.ingestedAt.localeCompare(left.ingestedAt)
        })

      const latestForPath = normalizedEvents[0]
      if (!latestForPath) continue

      const pathHaystack = `${pathValue} ${latestForPath.content ?? ''}`.toLowerCase()
      for (const event of normalizedEvents) {
        const eventHaystack = `${event.path} ${event.content ?? ''}`.toLowerCase()
        if (statusFilter && event.status !== statusFilter) continue
        if (q && !eventHaystack.includes(q)) continue
        events.push(event)
      }

      if (!(q && !pathHaystack.includes(q)) && !(statusFilter && latestForPath.status !== statusFilter)) {
        paths.push({
          key: `${String(volume._id)}::${pathValue}`,
          volume: candidateVolumeName,
          path: pathValue,
          segments: latestForPath.segments,
          status: latestForPath.status,
          lastTime: latestForPath.time,
          lastIngestedAt: latestForPath.ingestedAt,
          lastContent: latestForPath.content,
        })
      }
    }
  }

  paths.sort((left, right) => {
    const byStatus = statusRank(left.status) - statusRank(right.status)
    if (byStatus !== 0) return byStatus
    return right.lastIngestedAt.localeCompare(left.lastIngestedAt)
  })

  events.sort((left, right) => {
    const byTime = right.time.localeCompare(left.time)
    if (byTime !== 0) return byTime
    return right.ingestedAt.localeCompare(left.ingestedAt)
  })

  const totalEvents = events.length
  const limitedEvents = events.slice(0, limit)

  return toDashboardSnapshot({
    events: limitedEvents,
    topicTreeEvents: events,
    paths,
    totalEvents,
  })
}

export const dashboardSnapshot = query({
  args: {
    volume: v.optional(v.string()),
    topicPrefix: v.optional(v.string()),
    status: v.optional(v.string()),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    return buildSnapshot(ctx, {
      ...args,
      userId: typeof userId === 'string' ? userId : undefined,
    })
  },
})

export const statusSnapshot = query({
  args: {
    volume: v.optional(v.string()),
    topicPrefix: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    return buildSnapshot(ctx, {
      ...args,
      userId: typeof userId === 'string' ? userId : undefined,
      limit: args.limit ?? 200,
    })
  },
})
