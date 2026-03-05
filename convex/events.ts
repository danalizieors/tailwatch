import { v } from 'convex/values'
import { adjectives, nouns } from 'human-id'
import { api } from './_generated/api'
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

function buildDashboardEventUrl(volumeName: string, topicPath: string) {
  const safeVolume = encodeURIComponent(normalizeVolume(volumeName))
  const safePath = encodeURIComponent(normalizeTopicPath(topicPath))
  return `/dashboard/${safeVolume}?path=${safePath}`
}

function splitTopicPath(value: string) {
  const clean = normalizeTopicPath(value)
  const segments = clean.split('/').filter(Boolean)
  for (const segment of segments) {
    if (segment === '.' || segment === '..')
      throw new Error('Invalid path segment')
  }
  return segments
}

function normalizeEventStatus(input?: string) {
  const normalized = input?.trim().toLowerCase()
  return normalized === 'busy' ? 'busy' : 'idle'
}

function markdownToPlainText(input?: string) {
  if (typeof input !== 'string') return ''

  const normalizedNewlines = input.replace(/\r\n?/g, '\n')
  const withoutFences = normalizedNewlines.replace(
    /```[^\n]*\n?([\s\S]*?)```/g,
    '$1',
  )
  const withoutInlineCode = withoutFences.replace(/`([^`]+)`/g, '$1')
  const withoutImages = withoutInlineCode.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '$1',
  )
  const withoutLinks = withoutImages.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '$1',
  )
  const withoutHeadings = withoutLinks.replace(/^\s{0,3}#{1,6}\s+/gm, '')
  const withoutQuotes = withoutHeadings.replace(/^\s{0,3}>\s?/gm, '')
  const withoutListBullets = withoutQuotes.replace(
    /^\s{0,3}(?:[-*+]|\d+\.)\s+/gm,
    '',
  )
  const withoutHr = withoutListBullets.replace(/^\s{0,3}[-*_]{3,}\s*$/gm, '')
  const withoutFormatting = withoutHr.replace(/[*_~]+/g, '')
  const withoutHtmlTags = withoutFormatting.replace(/<[^>]*>/g, '')
  const decodedEntities = withoutHtmlTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
  return decodedEntities.replace(/\s+/g, ' ').trim()
}

function pickRandomItem(values: readonly string[]) {
  const index = Math.floor(Math.random() * values.length)
  return values[index] ?? values[0] ?? 'steady'
}

function singularizeNoun(value: string) {
  const word = value.toLowerCase()
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (
    word.endsWith('ches') ||
    word.endsWith('shes') ||
    word.endsWith('xes') ||
    word.endsWith('zes') ||
    word.endsWith('ses')
  ) {
    return word.slice(0, -2)
  }
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

function nextPrefix(prefix: string) {
  return (
    prefix.slice(0, -1) +
    String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1)
  )
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

async function ensureVolumeExists(
  ctx: any,
  volumeName: string,
  userId?: string,
) {
  const ownerId =
    typeof userId === 'string' && userId.trim().length > 0
      ? userId.trim()
      : undefined
  const existing = await ctx.db
    .query('volumes')
    .withIndex('by_user_and_name', (q: any) =>
      q.eq('userId', ownerId).eq('name', volumeName),
    )
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
    .withIndex('by_volumeId_and_path', (q: any) =>
      q.eq('volumeId', volumeId).eq('path', path),
    )
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
        typeof volumeDoc.userId === 'string' &&
        volumeDoc.userId.trim().length > 0
          ? volumeDoc.userId.trim()
          : undefined

      const targets = ownerUserId
        ? await ctx.db
            .query('devices')
            .withIndex('by_user', (q: any) => q.eq('userId', ownerUserId))
            .collect()
        : await ctx.db.query('devices').collect()

      const statusLabel = status.toUpperCase()
      const title = `${statusLabel} | ${finalPath}`
      const plainBody = markdownToPlainText(input.content)
      const bodyText = plainBody || `${finalPath} is ${statusLabel}`
      const tag = `tailwatch:${volumeName}:${finalPath}`
      const url = buildDashboardEventUrl(volumeName, finalPath)

      for (const target of targets) {
        if (!target.notifications || !target.subscription) continue

        await ctx.scheduler.runAfter(0, api.push.sendPushNotification, {
          deviceId: target._id,
          payload: { title, body: bodyText, tag, url },
          options: {
            ttl: 300,
            topic: tag,
            urgency: status === 'busy' ? 'high' : 'normal',
          },
        })
      }
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

async function collectMatchedPaths(
  ctx: any,
  volumeId: string,
  topicPrefix?: string,
) {
  if (!topicPrefix) {
    return await ctx.db
      .query('paths')
      .withIndex('by_volumeId', (q: any) => q.eq('volumeId', volumeId))
      .collect()
  }

  const prefix = normalizeTopicPath(topicPrefix)
  if (!prefix) {
    return await ctx.db
      .query('paths')
      .withIndex('by_volumeId', (q: any) => q.eq('volumeId', volumeId))
      .collect()
  }

  const subpathPrefix = `${prefix}/`
  const exact = await ctx.db
    .query('paths')
    .withIndex('by_volumeId_and_path', (q: any) =>
      q.eq('volumeId', volumeId).eq('path', prefix),
    )
    .first()
  const subpaths = await ctx.db
    .query('paths')
    .withIndex('by_volumeId_and_path', (q: any) =>
      q
        .eq('volumeId', volumeId)
        .gte('path', subpathPrefix)
        .lt('path', nextPrefix(subpathPrefix)),
    )
    .collect()
  return exact ? [exact, ...subpaths] : subpaths
}

async function getVolumeNotificationByUserAndVolume(
  ctx: any,
  userId: string,
  volumeId: string,
) {
  const rows = await ctx.db
    .query('volumeNotifications')
    .withIndex('by_user_and_volumeId', (q: any) =>
      q.eq('userId', userId).eq('volumeId', volumeId),
    )
    .collect()
  if (rows.length === 0) return null

  let primary = rows[0]
  for (const row of rows) {
    if ((row.seenAt ?? 0) > (primary.seenAt ?? 0)) {
      primary = row
    }
  }

  for (const row of rows) {
    if (row._id !== primary._id) {
      await ctx.db.delete(row._id)
    }
  }

  return primary
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

export const markVolumeSeen = mutation({
  args: {
    volumeId: v.string(),
    seenAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    const ownerId =
      typeof userId === 'string' && userId.trim().length > 0
        ? userId.trim()
        : undefined
    if (!ownerId) throw new Error('Sign in required')

    const ownedVolume = await ctx.db.get(args.volumeId as any)
    if (!ownedVolume || ownedVolume.userId !== ownerId) {
      throw new Error('Volume not found')
    }

    const incomingSeenAt = Number.isFinite(args.seenAt)
      ? Math.max(0, Math.floor(args.seenAt))
      : 0

    const existing = await getVolumeNotificationByUserAndVolume(
      ctx,
      ownerId,
      args.volumeId,
    )
    if (existing) {
      const mergedSeenAt = Math.max(existing.seenAt ?? 0, incomingSeenAt)
      if (mergedSeenAt !== existing.seenAt) {
        await ctx.db.patch(existing._id, {
          seenAt: mergedSeenAt,
        })
      }
      return {
        volumeId: args.volumeId,
        seenAt: mergedSeenAt,
      }
    }

    await ctx.db.insert('volumeNotifications', {
      userId: ownerId,
      volumeId: args.volumeId,
      seenAt: incomingSeenAt,
    })
    return {
      volumeId: args.volumeId,
      seenAt: incomingSeenAt,
    }
  },
})

export const deleteByTopicPrefix = mutation({
  args: {
    volume: v.optional(v.string()),
    topicPrefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    const ownerId =
      typeof userId === 'string' && userId.trim().length > 0
        ? userId.trim()
        : undefined
    if (!ownerId) throw new Error('Sign in required')

    const volumeName = normalizeVolume(args.volume)
    const topicPrefix = args.topicPrefix
      ? normalizeTopicPath(args.topicPrefix)
      : undefined

    const volumeDoc = await ctx.db
      .query('volumes')
      .withIndex('by_user_and_name', (q: any) =>
        q.eq('userId', ownerId).eq('name', volumeName),
      )
      .first()

    if (!volumeDoc) {
      return {
        volume: volumeName,
        topicPrefix,
        deletedPaths: 0,
        deletedEvents: 0,
      }
    }

    const matchedPaths = await collectMatchedPaths(
      ctx,
      String(volumeDoc._id),
      topicPrefix,
    )

    let deletedEvents = 0
    for (const pathDoc of matchedPaths) {
      const events = await ctx.db
        .query('events')
        .withIndex('by_pathId', (q: any) => q.eq('pathId', String(pathDoc._id)))
        .collect()

      for (const event of events) {
        await ctx.db.delete(event._id)
        deletedEvents += 1
      }

      await ctx.db.delete(pathDoc._id)
    }

    return {
      volume: volumeName,
      topicPrefix,
      deletedPaths: matchedPaths.length,
      deletedEvents,
    }
  },
})

export const statusSnapshot = dashboardSnapshot

export const unreadCountsByVolume = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (typeof userId !== 'string' || userId.trim().length === 0) return []
    const ownerId = userId.trim()

    const volumes = await ctx.db
      .query('volumes')
      .withIndex('by_user', (q: any) => q.eq('userId', ownerId))
      .collect()
    const notificationStates = await ctx.db
      .query('volumeNotifications')
      .withIndex('by_user', (q: any) => q.eq('userId', ownerId))
      .collect()
    const seenAtByVolumeId = new Map<string, number>()
    for (const state of notificationStates) {
      const volumeId = String(state.volumeId)
      const nextSeenAt = Number.isFinite(state.seenAt) ? Number(state.seenAt) : 0
      const previousSeenAt = seenAtByVolumeId.get(volumeId) ?? 0
      if (nextSeenAt > previousSeenAt) {
        seenAtByVolumeId.set(volumeId, nextSeenAt)
      }
    }

    const rows = await Promise.all(
      volumes.map(async (volume: any) => {
        const volumeId = String(volume._id)
        const seenAt = seenAtByVolumeId.get(volumeId) ?? 0
        const paths = await ctx.db
          .query('paths')
          .withIndex('by_volumeId', (q: any) => q.eq('volumeId', volumeId))
          .collect()

        const counts = await Promise.all(
          paths.map(async (pathDoc: any) => {
            const events = await ctx.db
              .query('events')
              .withIndex('by_pathId', (q: any) =>
                q.eq('pathId', String(pathDoc._id)),
              )
              .collect()

            return events.reduce((total: number, event: any) => {
              const timestamp = Date.parse(event.time)
              return Number.isFinite(timestamp) && timestamp > seenAt
                ? total + 1
                : total
            }, 0)
          }),
        )

        return {
          volumeId,
          volumeName: String(volume.name ?? ''),
          seenAt,
          count: counts.reduce((total, value) => total + value, 0),
        }
      }),
    )

    return rows.sort((left, right) => {
      if (left.volumeName === DEFAULT_VOLUME && right.volumeName !== DEFAULT_VOLUME)
        return -1
      if (left.volumeName !== DEFAULT_VOLUME && right.volumeName === DEFAULT_VOLUME)
        return 1
      return left.volumeName.localeCompare(right.volumeName)
    })
  },
})

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
    .withIndex('by_user_and_name', (q: any) =>
      q.eq('userId', args.userId).eq('name', volumeName),
    )
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

  const matchedPaths = await collectMatchedPaths(
    ctx,
    volumeId,
    args.topicPrefix,
  )

  const eventsInVolume = (
    await Promise.all(
      matchedPaths.map((p: any) =>
        ctx.db
          .query('events')
          .withIndex('by_pathId', (q: any) => q.eq('pathId', String(p._id)))
          .collect(),
      ),
    )
  )
    .flat()
    .sort((a: any, b: any) => b.time.localeCompare(a.time))

  const queryStatus = normalizeQueryStatus(args.statusFilter)
  const filteredEvents = queryStatus
    ? eventsInVolume.filter((e: any) => e.status === queryStatus)
    : eventsInVolume

  const pathMap = new Map(matchedPaths.map((p: any) => [String(p._id), p.path]))
  const eventCountByPath = new Map<string, number>()
  for (const event of eventsInVolume) {
    const eventPath = pathMap.get(event.pathId)
    if (!eventPath) continue
    eventCountByPath.set(eventPath, (eventCountByPath.get(eventPath) ?? 0) + 1)
  }

  const displayEvents = filteredEvents.slice(0, args.limit).map((e: any) => ({
    id: String(e._id),
    path: pathMap.get(e.pathId) ?? 'unknown',
    time: e.time,
    status: e.status,
    content: e.content,
  }))

  const entityStates = new Map<
    string,
    { lastSeenAt: string; status: 'busy' | 'idle'; lastContent?: string }
  >()
  for (const e of eventsInVolume) {
    const path = (pathMap.get(e.pathId) ?? 'unknown') as string
    const existing = entityStates.get(path)
    if (!existing || e.time > existing.lastSeenAt) {
      entityStates.set(path, {
        lastSeenAt: e.time,
        status: e.status,
        lastContent: e.content,
      })
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
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))

  const busyCount = Array.from(entityStates.values()).filter(
    (s) => s.status === 'busy',
  ).length
  const idleCount = Array.from(entityStates.values()).filter(
    (s) => s.status === 'idle',
  ).length

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
    topicTree: buildTopicTree(
      matchedPaths.map((p: any) => p.path),
      args.topicPrefix,
      eventCountByPath,
    ),
  }
}

function buildTopicTree(
  paths: string[],
  prefix?: string,
  eventCountByPath?: Map<string, number>,
) {
  const root: any = { name: 'root', children: new Map(), count: 0 }
  const prefixSegments = prefix ? prefix.split('/').filter(Boolean) : []

  for (const path of paths) {
    const segments = path.split('/').filter(Boolean)
    const pathCount = eventCountByPath?.get(path) ?? 0
    let current = root
    for (const segment of segments) {
      if (!current.children.has(segment)) {
        current.children.set(segment, {
          name: segment,
          children: new Map(),
          fullPath: '',
          count: 0,
        })
      }
      current = current.children.get(segment)
      current.count += pathCount
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
      count: node.count ?? 0,
      children: Array.from(node.children.values())
        .map((child) => convert(child, currentPath))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }
  }

  return Array.from(startNode.children.values()).map((child) =>
    convert(child, prefixSegments),
  )
}
