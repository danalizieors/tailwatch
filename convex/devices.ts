import { v } from 'convex/values'
import { buildPushHTTPRequest } from '@pushforge/builder'
import { internal } from './_generated/api'
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { auth } from './auth'

const DEFAULT_VOLUME = 'personal'

async function requireUserId(ctx: any) {
  const userId = await auth.getUserId(ctx)
  if (!userId) throw new Error('Sign in required')
  return userId
}

// -- Public API --

/**
 * Ensures a device exists for the current user.
 * Called on app bootstrap or login.
 */
export const registerDevice = mutation({
  args: { 
    deviceKey: v.string(), 
    name: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const existing = await ctx.db
      .query('devices')
      .withIndex('by_user_and_deviceKey', (q) => q.eq('userId', userId).eq('deviceKey', args.deviceKey))
      .first()

    const now = new Date().toISOString()
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        lastSeenAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert('devices', {
      userId,
      deviceKey: args.deviceKey,
      name: args.name ?? `Device ${args.deviceKey.slice(-6)}`,
      notifications: false,
      lastSeenAt: now,
    })
  },
})

/**
 * Saves a push subscription to a device and enables notifications.
 * Called when the user first enables notifications.
 */
export const updatePushSubscription = mutation({
  args: {
    deviceKey: v.string(),
    subscription: v.object({
      endpoint: v.string(),
      expirationTime: v.optional(v.number()),
      keys: v.object({
        p256dh: v.string(),
        auth: v.string(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const device = await ctx.db
      .query('devices')
      .withIndex('by_user_and_deviceKey', (q) => q.eq('userId', userId).eq('deviceKey', args.deviceKey))
      .first()
    if (!device) throw new Error('Device not found')

    await ctx.db.patch(device._id, {
      subscription: args.subscription,
      notifications: true,
      lastSeenAt: new Date().toISOString(),
    })
  },
})

/**
 * Toggles notifications for a device without changing the subscription.
 * Called when the user toggles the bell icon (if subscription already exists).
 */
export const setNotificationsEnabled = mutation({
  args: { 
    deviceKey: v.string(), 
    enabled: v.boolean() 
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const device = await ctx.db
      .query('devices')
      .withIndex('by_user_and_deviceKey', (q) => q.eq('userId', userId).eq('deviceKey', args.deviceKey))
      .first()
    if (!device) throw new Error('Device not found')

    await ctx.db.patch(device._id, {
      notifications: args.enabled,
      lastSeenAt: new Date().toISOString(),
    })
  },
})

/**
 * Updates a device by ID. Used in settings page.
 */
export const updateDevice = mutation({
  args: {
    deviceId: v.id('devices'),
    name: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const device = await ctx.db.get(args.deviceId)
    if (!device || device.userId !== userId) throw new Error('Unauthorized')

    const patch: any = { lastSeenAt: new Date().toISOString() }
    if (args.name !== undefined) patch.name = args.name
    if (args.enabled !== undefined) patch.notifications = args.enabled
    
    await ctx.db.patch(args.deviceId, patch)
  }
})

export const listDevices = query({
  args: { currentDeviceKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const rows = await ctx.db
      .query('devices')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    return rows
      .sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''))
      .map(row => ({
        id: row._id,
        name: row.name,
        deviceKey: row.deviceKey,
        enabled: row.notifications,
        notifications: row.notifications,
        hasSubscription: !!row.subscription,
        isCurrent: args.currentDeviceKey === row.deviceKey,
        lastSeenAt: row.lastSeenAt,
      }))
  },
})

export const deleteDevice = mutation({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const device = await ctx.db.get(args.deviceId)
    if (!device || device.userId !== userId) throw new Error('Unauthorized')
    await ctx.db.delete(args.deviceId)
  },
})

/**
 * Sends a test push notification to a specific device.
 */
export const sendTestPush = mutation({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const device = await ctx.db.get(args.deviceId)
    if (!device || device.userId !== userId) throw new Error('Unauthorized')

    if (!device.subscription || !device.notifications) {
      throw new Error('Notifications are not enabled for this device')
    }

    await ctx.scheduler.runAfter(0, internal.devices.sendPushForEventInternal, {
      volume: 'test',
      path: 'internal/test',
      status: 'idle',
      content: `Test notification for ${device.name}`,
      userId,
      deviceId: args.deviceId,
    })
  },
})

// -- Internal API for Push Delivery --

export const listPushTargetsInternal = internalQuery({
  args: { 
    userId: v.optional(v.string()),
    deviceId: v.optional(v.id('devices')),
  },
  handler: async (ctx, args) => {
    let rows
    if (args.deviceId) {
      const device = await ctx.db.get(args.deviceId)
      rows = device ? [device] : []
    } else if (args.userId) {
      rows = await ctx.db.query('devices').withIndex('by_user', q => q.eq('userId', args.userId!)).collect()
    } else {
      rows = await ctx.db.query('devices').collect()
    }
    
    return rows
      .filter(r => r.notifications && r.subscription)
      .map(r => ({
        deviceId: r._id,
        endpoint: r.subscription!.endpoint,
        p256dh: r.subscription!.keys.p256dh,
        auth: r.subscription!.keys.auth,
      }))
  }
})

export const clearPushSubscriptionInternal = internalMutation({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.deviceId, { subscription: undefined, notifications: false })
  }
})

export const sendPushForEventInternal = internalAction({
  args: {
    volume: v.string(),
    path: v.string(),
    status: v.union(v.literal('busy'), v.literal('idle')),
    content: v.optional(v.string()),
    userId: v.optional(v.string()),
    deviceId: v.optional(v.id('devices')),
  },
  handler: async (ctx, args) => {
    const rawKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY
    if (!rawKey) return { ok: false, reason: 'missing_vapid_key_env' }

    let privateJWK
    try {
      privateJWK = JSON.parse(rawKey)
    } catch (e) {
      console.error('VAPID_PRIVATE_KEY is not a valid JSON (JWK). Raw key starts with:', rawKey.slice(0, 10))
      return { ok: false, reason: 'invalid_vapid_key_format_must_be_jwk_json' }
    }

    const targets = await ctx.runQuery(internal.devices.listPushTargetsInternal, { 
      userId: args.userId,
      deviceId: args.deviceId,
    })
    if (targets.length === 0) return { ok: true, sent: 0, reason: 'no_targets' }

    const adminContact = process.env.WEB_PUSH_ADMIN_CONTACT || 'mailto:admin@example.com'
    const title = `Tailwatch ${args.status === 'busy' ? 'Busy' : 'Idle'}`
    const body = args.content?.trim() ? `${args.path}: ${args.content}` : `${args.path} is ${args.status}`
    const tag = `tailwatch:${args.volume}:${args.path}`
    const url = `/${args.volume === DEFAULT_VOLUME ? 'personal' : args.volume}?path=${encodeURIComponent(args.path)}`

    let sent = 0
    for (const target of targets) {
      try {
        const { endpoint, headers, body: requestBody } = await buildPushHTTPRequest({
          privateJWK,
          subscription: {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          message: {
            payload: { title, body, tag, url },
            adminContact,
            options: { ttl: 300, urgency: args.status === 'busy' ? 'high' : 'normal', topic: tag },
          },
        })

        const res = await fetch(endpoint, { method: 'POST', headers, body: requestBody })
        if (res.status === 404 || res.status === 410) {
          await ctx.runMutation(internal.devices.clearPushSubscriptionInternal, { deviceId: target.deviceId })
        } else if (res.ok) {
          sent++
        }
      } catch (e) { console.error('Push failed', e) }
    }
    return { ok: true, sent }
  }
})

// -- Path Alias Helpers (kept for compatibility) --
export const ensurePathAlias = mutation({
  args: { volume: v.optional(v.string()), path: v.string() },
  handler: async (_, args) => ({ path: args.path.replace(/^\/+|\/+$/g, ''), volume: args.volume ?? DEFAULT_VOLUME })
})

export const resolvePathAlias = query({
  args: { volume: v.optional(v.string()), aliasId: v.string() },
  handler: async (_, args) => ({ found: true, path: args.aliasId.replace(/^\/+|\/+$/g, ''), volume: args.volume ?? DEFAULT_VOLUME })
})

// -- Helpers --
function placeholder() {}
