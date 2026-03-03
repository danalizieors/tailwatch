import { v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { requireUserId } from './auth'

export const upsertDevice = mutation({
  args: {
    deviceKey: v.string(),
    name: v.string(),
    system: v.optional(v.string()),
    browser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    const existing = await ctx.db
      .query('devices')
      .withIndex('by_user_and_deviceKey', (q) =>
        q.eq('userId', userId).eq('deviceKey', args.deviceKey),
      )
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        system: args.system ?? existing.system,
        browser: args.browser ?? existing.browser,
        lastSeenAt: now,
      })

      return existing._id
    }

    return await ctx.db.insert('devices', {
      userId,
      deviceKey: args.deviceKey,
      name: args.name,
      system: args.system,
      browser: args.browser,
      notifications: false,
      lastSeenAt: now,
    })
  },
})

export const updateSubscription = mutation({
  args: {
    deviceKey: v.string(),
    subscription: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    const device = await ctx.db
      .query('devices')
      .withIndex('by_user_and_deviceKey', (q) =>
        q.eq('userId', userId).eq('deviceKey', args.deviceKey),
      )
      .first()

    if (!device) {
      throw new Error('device.missing')
    }

    await ctx.db.patch(device._id, {
      subscription: args.subscription,
      notifications: true,
      lastSeenAt: Date.now(),
    })
  },
})

export const setNotifications = mutation({
  args: {
    deviceKey: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    const device = await ctx.db
      .query('devices')
      .withIndex('by_user_and_deviceKey', (q) =>
        q.eq('userId', userId).eq('deviceKey', args.deviceKey),
      )
      .first()

    if (!device) {
      throw new Error('device.missing')
    }

    await ctx.db.patch(device._id, {
      notifications: args.enabled,
      lastSeenAt: Date.now(),
    })
  },
})

export const listDevices = query({
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)

    const rows = await ctx.db
      .query('devices')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    return rows.sort((a, b) => a.lastSeenAt - b.lastSeenAt)
  },
})

export const deleteDevice = mutation({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    await requireUserId(ctx)

    await ctx.db.delete(args.deviceId)
  },
})

export const getDeviceInternal = internalQuery({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deviceId)
  },
})

export const clearSubscriptionInternal = internalMutation({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.deviceId, {
      subscription: undefined,
      notifications: false,
    })
  },
})
