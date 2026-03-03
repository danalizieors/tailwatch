import { adjectives, nouns } from 'human-id'
import { v } from 'convex/values'
import { internal } from './_generated/api'
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

async function ensureVolumeExists(ctx: any, volumeName: string, userId?: string) {
  const ownerId = typeof userId === 'string' && userId.trim().length > 0 ? userId.trim() : undefined
  const existing = await ctx.db
    .query('volumes')
    .withIndex('by_user_and_name', (q: any) => q.eq('userId', ownerId).eq('name', volumeName))
    .first()
  if (existing) return existing

  const key = await generateUniqueVolumeKey(ctx)
  const volumeId = await ctx.db.insert('volumes', {
    userId: ownerId,
    name: volumeName,
    key,
    keyEnabled: true,
    notificationsEnabled: true,
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
    userId?: string
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
    volumeDoc = await ensureVolumeExists(ctx, volumeName, input.userId)
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

  // Schedule push if volume notifications are enabled
  if (volumeDoc.notificationsEnabled !== false) {
    try {
      const ownerUserId =
        typeof volumeDoc.userId === 'string' && volumeDoc.userId.trim().length > 0
          ? volumeDoc.userId.trim()
          : undefined
      const payload: {
        volume: string
        path: string
        status: 'busy' | 'idle'
        content?: string
        userId?: string
      } = {
        volume: volumeName,
        path: finalPath,
        status,
        content: input.content,
      }
      if (ownerUserId) payload.userId = ownerUserId

      await ctx.scheduler.runAfter(0, internal.push.sendPushForEventInternal, payload)
    } catch (error) {
      console.warn('Failed to schedule push notification delivery', error)
    }
  }

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
    const userId = await auth.getUserId(ctx)
    return publishResolved(ctx, {
      ...args,
      userId: userId ?? undefined,
    })
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

function normalizeQueryStatus(value?: string) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized || normalized === 'all') return undefined
  if (normalized === 'busy') return 'busy'
  if (normalized === 'idle') return 'idle'
  return undefined
}

export const dashboardSnapshot = query({
  args: {
    volume: v.optional(v.string()),
    topicPrefix: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
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

export const statusSnapshot = dashboardSnapshot

async function buildSnapshot(
  ctx: any,
  args: {
    userId?: string
    volume?: string
    topicPrefix?: string
    statusFilter?: string
    limit: number
  },
) {
  const volumeName = normalizeVolume(args.volume)
  const volumeDoc = await ctx.db
    .query('volumes')
    .withIndex('by_user_and_name', (q: any) => q.eq('userId', args.userId).eq('name', volumeName))
    .first()

  if (!volumeDoc) {
    return {
      volume: volumeName,
      stats: { totalEvents: 0, pathCount: 0, busyCount: 0, idleCount: 0 },
      events: [],
      entities: [],
      topicTree: [],
    }
  }

  const volumeId = String(volumeDoc._id)
  const paths = await ctx.db
    .query('paths')
    .withIndex('by_volumeId', (q: any) => q.eq('volumeId', volumeId))
    .collect()

  const matchedPaths = paths.filter((p: any) => pathMatchesPrefix(p.path, args.topicPrefix))
  const matchedPathIds = new Set(matchedPaths.map((p: any) => String(p._id)))

  const allEvents = await ctx.db
    .query('events')
    .collect()

  const eventsInVolume = allEvents
    .filter((e: any) => matchedPathIds.has(e.pathId))
    .sort((a: any, b: any) => b.time.localeCompare(a.time))

  const queryStatus = normalizeQueryStatus(args.statusFilter)
  const filteredEvents = queryStatus ? eventsInVolume.filter((e: any) => e.status === queryStatus) : eventsInVolume

  const pathMap = new Map(paths.map((p: any) => [String(p._id), p.path]))
  const displayEvents = filteredEvents.slice(0, args.limit).map((e: any) => ({
    id: String(e._id),
    path: pathMap.get(e.pathId) ?? 'unknown',
    time: e.time,
    status: e.status,
    content: e.content,
  }))

  const entityStates = new Map<string, { lastSeenAt: string; status: 'busy' | 'idle'; lastContent?: string }>()
  for (const e of eventsInVolume) {
    const path = pathMap.get(e.pathId) ?? 'unknown'
    const existing = entityStates.get(path)
    if (!existing || e.time > existing.lastSeenAt) {
      entityStates.set(path, { lastSeenAt: e.time, status: e.status, lastContent: e.content })
    }
  }

  const entities = Array.from(entityStates.entries())
    .map(([path, state]) => ({
      key: path,
      path,
      entityId: path.split('/').pop() || path,
      entityType: 'path' as const,
      currentStatus: state.status,
      lastSeenAt: state.lastSeenAt,
      lastContent: state.lastContent,
    }))
    .sort((a, b) => {
      if (a.currentStatus !== b.currentStatus) {
        return a.currentStatus === 'idle' ? -1 : 1
      }
      if (a.currentStatus === 'idle') {
        return a.lastSeenAt.localeCompare(b.lastSeenAt) // oldest to newest
      } else {
        return b.lastSeenAt.localeCompare(a.lastSeenAt) // newest to oldest
      }
    })

  const busyCount = Array.from(entityStates.values()).filter((s) => s.status === 'busy').length
  const idleCount = Array.from(entityStates.values()).filter((s) => s.status === 'idle').length

  return {
    volume: volumeName,
    stats: {
      totalEvents: eventsInVolume.length,
      pathCount: entityStates.size,
      busyCount,
      idleCount,
    },
    events: displayEvents,
    entities,
    topicTree: buildTopicTree(matchedPaths.map((p: any) => p.path), args.topicPrefix),
  }
}

function buildTopicTree(paths: string[], prefix?: string) {
  const root: any = { name: 'root', children: new Map() }
  const prefixSegments = prefix ? prefix.split('/').filter(Boolean) : []

  for (const path of paths) {
    const segments = path.split('/').filter(Boolean)
    let current = root
    for (const segment of segments) {
      if (!current.children.has(segment)) {
        current.children.set(segment, { name: segment, children: new Map(), fullPath: '' })
      }
      current = current.children.get(segment)
    }
  }

  let startNode = root
  for (const segment of prefixSegments) {
    if (startNode.children.has(segment)) {
      startNode = startNode.children.get(segment)
    } else {
      return []
    }
  }

  function convert(node: any, pathAcc: string[]): any {
    const currentPath = [...pathAcc, node.name].filter((s) => s !== 'root')
    const path = currentPath.join('/')
    return {
      id: path,
      name: node.name,
      path,
      count: 0, // Could be enriched if needed
      children: Array.from(node.children.values())
        .map((child) => convert(child, currentPath))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }
  }

  return Array.from(startNode.children.values()).map((child) => convert(child, prefixSegments))
}
