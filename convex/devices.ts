import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { auth } from './auth'

async function requireUserId(ctx: any) {
  const userId = await auth.getUserId(ctx)
  if (!userId) throw new Error('Sign in required')
  return userId
}

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

export const getDeviceInternal = internalQuery({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deviceId)
  }
})

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
