import { v } from 'convex/values'
import { adjectives, nouns } from 'human-id'
import { mutation, query } from './_generated/server'
import { getAuthenticatedContext } from './functions'

const DEFAULT_VOLUME_NAME = 'personal'
const MAX_VOLUME_NAME_LENGTH = 120

const KEY_ADJECTIVES = adjectives
const KEY_NOUNS = nouns

type VolumeDoc = {
  _id: any
  userId?: string
  name: string
  key?: string
  keyEnabled?: boolean
}

function normalizeUserId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const next = value.trim()
  return next ? next : undefined
}

function isOwnedByUser(ownerUserId: string | undefined, userId: string | undefined) {
  if (userId) return ownerUserId === userId
  return !ownerUserId
}

function normalizeVolumeName(value: string) {
  const next = value.trim()
  if (!next) throw new Error('Volume name is required')
  if (next.length > MAX_VOLUME_NAME_LENGTH) {
    throw new Error(`Volume name must be ${MAX_VOLUME_NAME_LENGTH} characters or fewer`)
  }
  if (next.includes('/')) {
    throw new Error('Volume name cannot contain "/"')
  }
  return next
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

async function createOwnedVolume(ctx: any, userId: string | undefined, name: string) {
  const key = await generateUniqueVolumeKey(ctx)
  const insertedId = await ctx.db.insert('volumes', {
    userId,
    name,
    key,
    keyEnabled: true,
  })

  return (await ctx.db.get(insertedId)) as VolumeDoc | null
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

async function listOwnedVolumes(ctx: any, userId: string | undefined) {
  return (await ctx.db
    .query('volumes')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .collect()) as VolumeDoc[]
}

async function findOwnedVolumeByName(ctx: any, userId: string | undefined, name: string) {
  const rows = (await ctx.db
    .query('volumes')
    .withIndex('by_user_and_name', (q: any) => q.eq('userId', userId).eq('name', name))
    .collect()) as VolumeDoc[]
  return rows[0] ?? null
}

async function ensurePersonalVolumeForUser(ctx: any, userId: string | undefined) {
  if (!userId) return null

  const existing = await findOwnedVolumeByName(ctx, userId, DEFAULT_VOLUME_NAME)
  if (existing) {
    return ensureVolumeHasKey(ctx, existing)
  }

  return createOwnedVolume(ctx, userId, DEFAULT_VOLUME_NAME)
}

async function assertVolumeOwnership(ctx: any, volumeId: any, userId: string | undefined) {
  const volume = (await ctx.db.get(volumeId)) as VolumeDoc | null
  if (!volume) throw new Error('Volume not found')
  if (!isOwnedByUser(volume.userId, userId)) throw new Error('Unauthorized volume access')
  return volume
}

function mapVolumeKey(row: VolumeDoc) {
  const volumeId = String(row._id)
  return {
    id: volumeId,
    volumeId,
    value: typeof row.key === 'string' ? row.key : '',
    enabled: row.keyEnabled !== false,
  }
}

function mapVolume(row: VolumeDoc) {
  return {
    id: String(row._id),
    name: row.name,
    isDefault: row.name === DEFAULT_VOLUME_NAME,
    key: mapVolumeKey(row),
  }
}

export const ensurePersonalVolume = mutation({
  args: {},
  handler: async (ctx) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const userId = normalizeUserId(authCtx.userId ? String(authCtx.userId) : undefined)
    const volume = await ensurePersonalVolumeForUser(ctx, userId)
    if (!volume) return null
    return mapVolume(volume)
  },
})

export const listManagedVolumes = query({
  args: {},
  handler: async (ctx) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const userId = normalizeUserId(authCtx.userId ? String(authCtx.userId) : undefined)

    const volumes = await listOwnedVolumes(ctx, userId)

    return volumes
      .slice()
      .sort((a, b) => {
        if (a.name === DEFAULT_VOLUME_NAME && b.name !== DEFAULT_VOLUME_NAME) return -1
        if (a.name !== DEFAULT_VOLUME_NAME && b.name === DEFAULT_VOLUME_NAME) return 1
        return a.name.localeCompare(b.name)
      })
      .map(mapVolume)
  },
})

export const createVolume = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const userId = normalizeUserId(authCtx.userId ? String(authCtx.userId) : undefined)
    await ensurePersonalVolumeForUser(ctx, userId)

    const name = normalizeVolumeName(args.name)
    const existing = await findOwnedVolumeByName(ctx, userId, name)
    if (existing) {
      throw new Error('Volume name already exists')
    }

    const inserted = await createOwnedVolume(ctx, userId, name)
    if (!inserted) throw new Error('Failed to create volume')

    return mapVolume(inserted)
  },
})

export const renameVolume = mutation({
  args: {
    volumeId: v.id('volumes'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const userId = normalizeUserId(authCtx.userId ? String(authCtx.userId) : undefined)
    await ensurePersonalVolumeForUser(ctx, userId)

    const volume = await assertVolumeOwnership(ctx, args.volumeId, userId)
    const nextName = normalizeVolumeName(args.name)

    if (volume.name === DEFAULT_VOLUME_NAME && nextName !== DEFAULT_VOLUME_NAME) {
      throw new Error('The personal volume cannot be renamed')
    }

    const duplicate = await findOwnedVolumeByName(ctx, userId, nextName)
    if (duplicate && String(duplicate._id) !== String(volume._id)) {
      throw new Error('Volume name already exists')
    }

    await ctx.db.patch(args.volumeId, { name: nextName })
    const updated = (await ctx.db.get(args.volumeId)) as VolumeDoc | null
    if (!updated) throw new Error('Volume not found after update')

    return mapVolume(updated)
  },
})

export const updateVolumeKey = mutation({
  args: {
    volumeId: v.id('volumes'),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const userId = normalizeUserId(authCtx.userId ? String(authCtx.userId) : undefined)
    await ensurePersonalVolumeForUser(ctx, userId)

    await assertVolumeOwnership(ctx, args.volumeId, userId)

    const patch: Record<string, unknown> = {}
    if (typeof args.enabled === 'boolean') {
      patch.keyEnabled = args.enabled
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.volumeId, patch)
    }

    const current = (await ctx.db.get(args.volumeId)) as VolumeDoc | null
    if (!current) throw new Error('Volume not found after key update')

    const updated = await ensureVolumeHasKey(ctx, current)
    return mapVolumeKey(updated)
  },
})

export const rotateVolumeKey = mutation({
  args: {
    volumeId: v.id('volumes'),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const userId = normalizeUserId(authCtx.userId ? String(authCtx.userId) : undefined)
    await ensurePersonalVolumeForUser(ctx, userId)

    await assertVolumeOwnership(ctx, args.volumeId, userId)

    const value = await generateUniqueVolumeKey(ctx)
    await ctx.db.patch(args.volumeId, {
      key: value,
      keyEnabled: true,
    })

    const updated = (await ctx.db.get(args.volumeId)) as VolumeDoc | null
    if (!updated) throw new Error('Volume not found after rotation')
    return mapVolumeKey(updated)
  },
})
