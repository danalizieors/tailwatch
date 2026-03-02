import { adjectives, nouns } from 'human-id'
import { v } from 'convex/values'
import { auth } from './auth'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'

const DEFAULT_VOLUME_NAME = 'personal'
const MAX_VOLUME_NAME_LENGTH = 120

type VolumeDoc = Doc<'volumes'>
type VolumeId = Id<'volumes'>

function normalizeUserId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const next = value.trim()
  return next.length > 0 ? next : undefined
}

async function getCurrentUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await auth.getUserId(ctx)
  return normalizeUserId(userId)
}

async function requireCurrentUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getCurrentUserId(ctx)
  if (!userId) throw new Error('Sign in required')
  return userId
}

function isOwnedByUser(volume: VolumeDoc, userId: string | undefined) {
  return normalizeUserId(volume.userId) === userId
}

function normalizeVolumeName(value: string) {
  const next = value.trim()
  if (next.length === 0) throw new Error('Volume name is required')
  if (next.length > MAX_VOLUME_NAME_LENGTH) {
    throw new Error(`Volume name must be ${MAX_VOLUME_NAME_LENGTH} characters or fewer`)
  }
  if (next.includes('/')) throw new Error('Volume name cannot contain "/"')
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
  const adjective = pickRandomItem(adjectives)
  const noun = singularizeNoun(pickRandomItem(nouns))
  const number = 10 + Math.floor(Math.random() * 90)
  return `${adjective}-${noun}-${number}`
}

async function generateUniqueVolumeKey(ctx: QueryCtx | MutationCtx) {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const candidate = generateHumanReadableKey()
    const existing = await ctx.db
      .query('volumes')
      .withIndex('by_key', (q) => q.eq('key', candidate))
      .first()
    if (!existing) return candidate
  }
  throw new Error('Failed to generate a unique API key')
}

async function findOwnedVolumeByName(ctx: QueryCtx | MutationCtx, userId: string | undefined, name: string) {
  const rows = await ctx.db
    .query('volumes')
    .withIndex('by_user_and_name', (q) => q.eq('userId', userId).eq('name', name))
    .collect()
  return (rows[0] as VolumeDoc | undefined) ?? null
}

async function listOwnedVolumes(ctx: QueryCtx | MutationCtx, userId: string | undefined) {
  return (await ctx.db
    .query('volumes')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()) as VolumeDoc[]
}

async function createOwnedVolume(ctx: MutationCtx, userId: string | undefined, name: string) {
  const key = await generateUniqueVolumeKey(ctx)
  const volumeId = await ctx.db.insert('volumes', {
    userId,
    name,
    key,
    keyEnabled: true,
    notificationsEnabled: true,
  })
  const created = await ctx.db.get(volumeId)
  if (!created) throw new Error('Failed to create volume')
  return created as VolumeDoc
}

async function ensurePersonalVolumeForUser(ctx: MutationCtx, userId: string | undefined) {
  const existing = await findOwnedVolumeByName(ctx, userId, DEFAULT_VOLUME_NAME)
  if (existing) return existing
  return createOwnedVolume(ctx, userId, DEFAULT_VOLUME_NAME)
}

async function assertVolumeOwnership(ctx: MutationCtx, volumeId: VolumeId, userId: string | undefined) {
  const volume = await ctx.db.get(volumeId)
  if (!volume) throw new Error('Volume not found')
  if (!isOwnedByUser(volume as VolumeDoc, userId)) throw new Error('Unauthorized volume access')
  return volume as VolumeDoc
}

function mapVolume(row: VolumeDoc) {
  const keyValue = typeof row.key === 'string' ? row.key.trim() : ''
  const keyEnabled = row.keyEnabled !== false && keyValue.length > 0

  return {
    id: row._id,
    name: row.name,
    isDefault: row.name === DEFAULT_VOLUME_NAME,
    notificationsEnabled: row.notificationsEnabled !== false,
    key: {
      id: `${row._id}:key`,
      volumeId: row._id,
      value: keyValue,
      enabled: keyEnabled,
    },
  }
}

export const listManagedVolumes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUserId(ctx)
    const volumes = await listOwnedVolumes(ctx, userId)

    return volumes
      .slice()
      .sort((left, right) => {
        if (left.name === DEFAULT_VOLUME_NAME && right.name !== DEFAULT_VOLUME_NAME) return -1
        if (left.name !== DEFAULT_VOLUME_NAME && right.name === DEFAULT_VOLUME_NAME) return 1
        return left.name.localeCompare(right.name)
      })
      .map(mapVolume)
  },
})

export const ensurePersonalVolume = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireCurrentUserId(ctx)
    const volume = await ensurePersonalVolumeForUser(ctx, userId)
    return mapVolume(volume)
  },
})

export const createVolume = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx)
    await ensurePersonalVolumeForUser(ctx, userId)

    const name = normalizeVolumeName(args.name)
    const duplicate = await findOwnedVolumeByName(ctx, userId, name)
    if (duplicate) throw new Error('Volume name already exists')

    const created = await createOwnedVolume(ctx, userId, name)
    return mapVolume(created)
  },
})

export const renameVolume = mutation({
  args: {
    volumeId: v.id('volumes'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx)
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
    const updated = await ctx.db.get(args.volumeId)
    if (!updated) throw new Error('Volume not found after rename')

    return mapVolume(updated as VolumeDoc)
  },
})

export const updateVolumeKey = mutation({
  args: {
    volumeId: v.id('volumes'),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx)
    await ensurePersonalVolumeForUser(ctx, userId)

    const volume = await assertVolumeOwnership(ctx, args.volumeId, userId)
    const patch: Partial<VolumeDoc> = {}

    if (args.enabled === false) {
      patch.key = undefined
      patch.keyEnabled = false
    }

    if (args.enabled === true) {
      const hasKey = typeof volume.key === 'string' && volume.key.trim().length > 0
      patch.keyEnabled = true
      if (!hasKey) {
        patch.key = await generateUniqueVolumeKey(ctx)
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.volumeId, patch)
    }

    const updated = await ctx.db.get(args.volumeId)
    if (!updated) throw new Error('Volume not found after key update')
    return mapVolume(updated as VolumeDoc).key
  },
})

export const rotateVolumeKey = mutation({
  args: {
    volumeId: v.id('volumes'),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx)
    await ensurePersonalVolumeForUser(ctx, userId)

    await assertVolumeOwnership(ctx, args.volumeId, userId)

    const nextKey = await generateUniqueVolumeKey(ctx)
    await ctx.db.patch(args.volumeId, {
      key: nextKey,
      keyEnabled: true,
    })

    const updated = await ctx.db.get(args.volumeId)
    if (!updated) throw new Error('Volume not found after key rotation')
    return mapVolume(updated as VolumeDoc).key
  },
})

export const disableVolumeKey = mutation({
  args: {
    volumeId: v.id('volumes'),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx)
    await ensurePersonalVolumeForUser(ctx, userId)

    await assertVolumeOwnership(ctx, args.volumeId, userId)

    await ctx.db.patch(args.volumeId, {
      key: undefined,
      keyEnabled: false,
    })

    const updated = await ctx.db.get(args.volumeId)
    if (!updated) throw new Error('Volume not found after key disable')
    return mapVolume(updated as VolumeDoc).key
  },
})

export const setVolumeNotificationsEnabled = mutation({
  args: {
    volumeId: v.id('volumes'),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx)
    await ensurePersonalVolumeForUser(ctx, userId)
    await assertVolumeOwnership(ctx, args.volumeId, userId)

    await ctx.db.patch(args.volumeId, {
      notificationsEnabled: args.enabled,
    })

    const updated = await ctx.db.get(args.volumeId)
    if (!updated) throw new Error('Volume not found after notification update')

    return {
      volumeId: updated._id,
      enabled: updated.notificationsEnabled !== false,
    }
  },
})

export const deleteVolume = mutation({
  args: {
    volumeId: v.id('volumes'),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx)
    await ensurePersonalVolumeForUser(ctx, userId)

    const volume = await assertVolumeOwnership(ctx, args.volumeId, userId)
    if (volume.name === DEFAULT_VOLUME_NAME) {
      throw new Error('The personal volume cannot be deleted')
    }

    const paths = await ctx.db
      .query('paths')
      .withIndex('by_volumeId', (q) => q.eq('volumeId', String(args.volumeId)))
      .collect()

    let deletedEvents = 0
    for (const path of paths) {
      const events = await ctx.db
        .query('events')
        .withIndex('by_pathId', (q) => q.eq('pathId', String(path._id)))
        .collect()
      deletedEvents += events.length

      for (const event of events) {
        await ctx.db.delete(event._id)
      }
      await ctx.db.delete(path._id)
    }

    await ctx.db.delete(args.volumeId)

    return {
      deleted: true,
      deletedPaths: paths.length,
      deletedEvents,
    }
  },
})
