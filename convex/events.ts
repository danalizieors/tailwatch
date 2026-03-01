import { adjectives, nouns } from 'human-id'
import { v } from 'convex/values'
import { mutation } from './_generated/server'

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
