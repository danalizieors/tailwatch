import { v } from 'convex/values'
import { buildPushHTTPRequest } from '@pushforge/builder'
import { internal } from './_generated/api'
import { internalAction, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { auth } from './auth'

const DEFAULT_VOLUME = 'personal'
const DEFAULT_INCLUDE_PATHS = ['/']

type DeviceDoc = Doc<'devices'>
type DeviceId = Id<'devices'>

type PushTarget = {
  deviceId: DeviceId
  endpoint: string
  expirationTime?: number
  p256dh: string
  auth: string
}

function normalizeAdminContact(value?: string) {
  const next = value?.trim()
  if (!next) return 'mailto:admin@example.com'
  return next
}

function parseVapidPrivateKey() {
  const raw = process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? process.env.VAPID_PRIVATE_KEY
  if (!raw || !raw.trim()) return null

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (
      parsed &&
      parsed.kty === 'EC' &&
      parsed.crv === 'P-256' &&
      typeof parsed.x === 'string' &&
      typeof parsed.y === 'string' &&
      typeof parsed.d === 'string'
    ) {
      return {
        kty: parsed.kty,
        crv: parsed.crv,
        x: parsed.x,
        y: parsed.y,
        d: parsed.d,
      }
    }
  } catch {
    // Ignore parse errors and return null.
  }

  return null
}

function buildPushUrl(volume: string, path: string) {
  const normalizedVolume = normalizeVolume(volume)
  const base = normalizedVolume === DEFAULT_VOLUME ? '/personal' : `/${encodeURIComponent(normalizedVolume)}`
  return `${base}?path=${encodeURIComponent(path)}`
}

function toPushTargets(rows: DeviceDoc[]): PushTarget[] {
  const targets: PushTarget[] = []
  for (const row of rows) {
    if (!row.notifications) continue
    const subscription = row.subscription
    if (!subscription?.endpoint) continue
    if (!subscription.keys?.p256dh || !subscription.keys?.auth) continue
    targets.push({
      deviceId: row._id,
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
  }
  return targets
}

function normalizeVolume(value?: string) {
  const next = value?.trim()
  return next || DEFAULT_VOLUME
}

function normalizeTopicPath(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return '/'
  return trimmed.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function randomDeviceKey() {
  return `device_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeDeviceKey(value?: string) {
  const next = value?.trim()
  if (!next) return randomDeviceKey()
  return next.slice(0, 128)
}

function normalizeUserId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const next = value.trim()
  return next.length > 0 ? next : undefined
}

function defaultDeviceName(deviceKey: string, explicitName?: string) {
  const named = explicitName?.trim()
  if (named) return named.slice(0, 120)

  return `Device ${deviceKey.slice(-6)}`
}

function toIso(value: number | undefined) {
  return new Date(value ?? Date.now()).toISOString()
}

function mapDevice(doc: DeviceDoc, currentDeviceKey?: string, volume?: string) {
  const lastSeenAt = typeof doc.lastSeenAt === 'string' && doc.lastSeenAt.trim() ? doc.lastSeenAt : toIso(doc._creationTime)
  const legacy = doc as DeviceDoc & { endpoint?: string; p256dh?: string; auth?: string; expirationTime?: number }
  const subscription = doc.subscription
    ? {
        endpoint: doc.subscription.endpoint,
        expirationTime: doc.subscription.expirationTime,
        keys: {
          p256dh: doc.subscription.keys.p256dh,
          auth: doc.subscription.keys.auth,
        },
      }
    : typeof legacy.endpoint === 'string' && typeof legacy.p256dh === 'string' && typeof legacy.auth === 'string'
      ? {
          endpoint: legacy.endpoint,
          expirationTime: typeof legacy.expirationTime === 'number' ? legacy.expirationTime : undefined,
          keys: {
            p256dh: legacy.p256dh,
            auth: legacy.auth,
          },
        }
    : undefined
  return {
    id: doc._id,
    volume: normalizeVolume(volume),
    deviceKey: doc.deviceKey,
    name: doc.name,
    enabled: Boolean(doc.notifications),
    includePaths: [...DEFAULT_INCLUDE_PATHS],
    ignorePaths: [] as string[],
    endpoint: subscription?.endpoint,
    subscription,
    hasSubscription: Boolean(subscription?.endpoint && subscription?.keys?.p256dh && subscription?.keys?.auth),
    createdAt: toIso(doc._creationTime),
    updatedAt: lastSeenAt,
    isCurrent: currentDeviceKey ? doc.deviceKey === currentDeviceKey : undefined,
  }
}

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = normalizeUserId(await auth.getUserId(ctx))
  if (!userId) {
    throw new Error('Sign in required')
  }
  return userId
}

async function findDeviceByKey(ctx: QueryCtx | MutationCtx, userId: string, deviceKey: string) {
  return await ctx.db
    .query('devices')
    .withIndex('by_user_and_deviceKey', (q) => q.eq('userId', userId).eq('deviceKey', deviceKey))
    .first()
}

async function ensureCurrentDevice(
  ctx: MutationCtx,
  input: { userId: string; volume?: string; deviceKey?: string; name?: string },
) {
  const deviceKey = normalizeDeviceKey(input.deviceKey)
  const now = new Date().toISOString()
  const existing = await findDeviceByKey(ctx, input.userId, deviceKey)

  if (existing) {
    await ctx.db.patch(existing._id, {
      name: defaultDeviceName(deviceKey, input.name),
      lastSeenAt: now,
    })
    const next = await ctx.db.get(existing._id)
    if (!next) throw new Error('Device not found after update')
    return next as DeviceDoc
  }

  const id = await ctx.db.insert('devices', {
    userId: input.userId,
    deviceKey,
    name: defaultDeviceName(deviceKey, input.name),
    notifications: false,
    subscription: undefined,
    lastSeenAt: now,
  })

  const created = await ctx.db.get(id)
  if (!created) throw new Error('Device not found after create')
  return created as DeviceDoc
}

async function assertDeviceOwnership(ctx: MutationCtx, userId: string, deviceId: DeviceId) {
  const device = await ctx.db.get(deviceId)
  if (!device) throw new Error('Device not found')
  if (device.userId !== userId) throw new Error('Unauthorized device access')
  return device as DeviceDoc
}

export const ensureDefaultDevice = mutation({
  args: {
    volume: v.optional(v.string()),
    deviceKey: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    const device = await ensureCurrentDevice(ctx, {
      userId,
      volume: args.volume,
      deviceKey: args.deviceKey,
      name: args.name,
    })

    return {
      ...mapDevice(device, device.deviceKey, args.volume),
      isCurrent: true,
    }
  },
})

export const getOrCreateCurrentDevice = mutation({
  args: {
    volume: v.optional(v.string()),
    deviceKey: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    const device = await ensureCurrentDevice(ctx, {
      userId,
      volume: args.volume,
      deviceKey: args.deviceKey,
      name: args.name,
    })

    return {
      ...mapDevice(device, device.deviceKey, args.volume),
      isCurrent: true,
    }
  },
})

export const listDevices = query({
  args: {
    volume: v.optional(v.string()),
    deviceKey: v.optional(v.string()),
    currentDeviceKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const scopedDeviceKey = args.deviceKey ? normalizeDeviceKey(args.deviceKey) : undefined

    const rows = await ctx.db
      .query('devices')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    return rows
      .filter((row) => (scopedDeviceKey ? row.deviceKey === scopedDeviceKey : true))
      .sort((left, right) => {
        const leftTime = new Date(left.lastSeenAt ?? toIso(left._creationTime)).getTime()
        const rightTime = new Date(right.lastSeenAt ?? toIso(right._creationTime)).getTime()
        return rightTime - leftTime
      })
      .map((row) => mapDevice(row as DeviceDoc, args.currentDeviceKey, args.volume))
  },
})

export const createDevice = mutation({
  args: {
    volume: v.optional(v.string()),
    name: v.optional(v.string()),
    includePaths: v.optional(v.array(v.string())),
    ignorePaths: v.optional(v.array(v.string())),
    deviceKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    let deviceKey = normalizeDeviceKey(args.deviceKey)
    const existing = await findDeviceByKey(ctx, userId, deviceKey)
    if (existing) {
      deviceKey = randomDeviceKey()
    }

    const id = await ctx.db.insert('devices', {
      userId,
      deviceKey,
      name: defaultDeviceName(deviceKey, args.name),
      notifications: false,
      subscription: undefined,
      lastSeenAt: new Date().toISOString(),
    })

    const created = await ctx.db.get(id)
    if (!created) throw new Error('Device not found after create')
    return mapDevice(created as DeviceDoc, deviceKey, args.volume)
  },
})

export const updateDevice = mutation({
  args: {
    deviceId: v.id('devices'),
    enabled: v.optional(v.boolean()),
    name: v.optional(v.string()),
    includePaths: v.optional(v.array(v.string())),
    ignorePaths: v.optional(v.array(v.string())),
    deviceKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const device = await assertDeviceOwnership(ctx, userId, args.deviceId)

    if (args.deviceKey && device.deviceKey !== normalizeDeviceKey(args.deviceKey)) {
      throw new Error('Unauthorized device access')
    }

    const patch: Partial<DeviceDoc> = {
      lastSeenAt: new Date().toISOString(),
    }

    if (typeof args.enabled === 'boolean') {
      patch.notifications = args.enabled
    }

    if (typeof args.name === 'string') {
      patch.name = defaultDeviceName(device.deviceKey, args.name)
    }

    await ctx.db.patch(args.deviceId, patch)

    const next = await ctx.db.get(args.deviceId)
    if (!next) throw new Error('Device not found after update')
    return mapDevice(next as DeviceDoc, args.deviceKey)
  },
})

export const deleteDevice = mutation({
  args: {
    deviceId: v.id('devices'),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    await assertDeviceOwnership(ctx, userId, args.deviceId)
    await ctx.db.delete(args.deviceId)
    return { deleted: true }
  },
})

export const upsertPushSubscription = mutation({
  args: {
    endpoint: v.string(),
    expirationTime: v.optional(v.number()),
    p256dh: v.string(),
    auth: v.string(),
    deviceKey: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    const device = await ensureCurrentDevice(ctx, {
      userId,
      deviceKey: args.deviceKey ?? args.endpoint,
      name: args.deviceName,
    })

    await ctx.db.patch(device._id, {
      subscription: {
        endpoint: args.endpoint,
        expirationTime: args.expirationTime,
        keys: {
          p256dh: args.p256dh,
          auth: args.auth,
        },
      },
      notifications: args.enabled ?? true,
      lastSeenAt: new Date().toISOString(),
    })

    return {
      ok: true,
      id: String(device._id),
      updated: true,
      pushConfigured: true,
    }
  },
})

export const removePushSubscription = mutation({
  args: {
    endpoint: v.optional(v.string()),
    deviceKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    if (!args.endpoint && !args.deviceKey) {
      throw new Error('endpoint or deviceKey is required')
    }

    const devices = await ctx.db
      .query('devices')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    let deleted = 0
    for (const device of devices) {
      const matchesDeviceKey = args.deviceKey ? device.deviceKey === args.deviceKey : false
      const legacyEndpoint = (device as DeviceDoc & { endpoint?: string }).endpoint
      const matchesEndpoint = args.endpoint
        ? device.subscription?.endpoint === args.endpoint || legacyEndpoint === args.endpoint
        : false
      if (!matchesDeviceKey && !matchesEndpoint) continue

      await ctx.db.patch(device._id, {
        subscription: undefined,
        notifications: false,
        lastSeenAt: new Date().toISOString(),
      })
      deleted += 1
    }

    return {
      ok: true,
      deleted,
    }
  },
})

export const listPushTargetsInternal = internalQuery({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedUserId = normalizeUserId(args.userId)
    const rows = normalizedUserId
      ? await ctx.db
          .query('devices')
          .withIndex('by_user', (q) => q.eq('userId', normalizedUserId))
          .collect()
      : await ctx.db.query('devices').collect()
    return toPushTargets(rows as DeviceDoc[])
  },
})

export const clearPushSubscriptionInternal = internalMutation({
  args: {
    deviceId: v.id('devices'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.deviceId, {
      subscription: undefined,
      notifications: false,
      lastSeenAt: new Date().toISOString(),
    })
    return { ok: true }
  },
})

export const sendPushForEventInternal = internalAction({
  args: {
    volume: v.string(),
    path: v.string(),
    status: v.union(v.literal('busy'), v.literal('idle')),
    content: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const privateJWK = parseVapidPrivateKey()
    if (!privateJWK) {
      return {
        ok: false,
        reason: 'missing_vapid_private_key',
      }
    }

    const targets = (await ctx.runQuery(internal.devices.listPushTargetsInternal, {
      userId: args.userId,
    })) as PushTarget[]

    if (targets.length === 0) {
      return {
        ok: true,
        total: 0,
        sent: 0,
        failed: 0,
        removed: 0,
      }
    }

    const adminContact = normalizeAdminContact(process.env.WEB_PUSH_ADMIN_CONTACT)
    const title = `Tailwatch ${args.status === 'busy' ? 'Busy' : 'Idle'}`
    const body = args.content?.trim()
      ? `${args.path}: ${args.content.trim().slice(0, 220)}`
      : `${args.path} changed status to ${args.status}.`
    const url = buildPushUrl(args.volume, args.path)
    const tag = `tailwatch:${args.volume}:${args.path}`.slice(0, 120)

    let sent = 0
    let failed = 0
    let removed = 0

    for (const target of targets) {
      try {
        const { endpoint, headers, body: requestBody } = await buildPushHTTPRequest({
          privateJWK,
          subscription: {
            endpoint: target.endpoint,
            keys: {
              p256dh: target.p256dh,
              auth: target.auth,
            },
          },
          message: {
            payload: {
              title,
              body,
              tag,
              url,
            },
            adminContact,
            options: {
              ttl: 300,
              urgency: args.status === 'busy' ? 'high' : 'normal',
              topic: tag,
            },
          },
        })

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: requestBody,
        })

        if (response.status === 404 || response.status === 410) {
          await ctx.runMutation(internal.devices.clearPushSubscriptionInternal, {
            deviceId: target.deviceId,
          })
          removed += 1
          failed += 1
          continue
        }

        if (!response.ok) {
          failed += 1
          continue
        }

        sent += 1
      } catch {
        failed += 1
      }
    }

    return {
      ok: true,
      total: targets.length,
      sent,
      failed,
      removed,
    }
  },
})

export const ensurePathAlias = mutation({
  args: {
    volume: v.optional(v.string()),
    path: v.string(),
  },
  handler: async (_ctx, args) => {
    const volume = normalizeVolume(args.volume)
    const path = normalizeTopicPath(args.path)

    return {
      aliasId: path,
      path,
      volume,
      created: false,
    }
  },
})

export const resolvePathAlias = query({
  args: {
    volume: v.optional(v.string()),
    aliasId: v.string(),
  },
  handler: async (_ctx, args) => {
    const volume = normalizeVolume(args.volume)
    const path = normalizeTopicPath(args.aliasId)

    if (!path || path === '/') {
      return {
        found: false,
      }
    }

    return {
      found: true,
      path,
      aliasId: path,
      volume,
    }
  },
})

export const ensurePathAliasInternal = internalMutation({
  args: {
    volume: v.optional(v.string()),
    path: v.string(),
  },
  handler: async (_ctx, args) => {
    const volume = normalizeVolume(args.volume)
    const path = normalizeTopicPath(args.path)

    return {
      aliasId: path,
      path,
      volume,
      created: false,
    }
  },
})
