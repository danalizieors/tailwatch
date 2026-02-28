import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { getAuthenticatedContext } from './functions'

const DEFAULT_VOLUME = 'personal'
const DEFAULT_INCLUDE_PATHS = ['/']

function normalizeVolume(value?: string) {
  const next = value?.trim()
  return next || DEFAULT_VOLUME
}

function normalizeTopicPath(value: string) {
  return value.replace(/^\/+|\/+$/g, '').replace(/\/+$/g, '').replace(/\/+/g, '/')
}

function normalizeDeviceKey(value?: string) {
  const next = value?.trim()
  if (!next) {
    return `device_${Math.random().toString(36).slice(2, 10)}`
  }
  return next.slice(0, 128)
}

function defaultDeviceName(deviceKey: string, userAgent?: string, explicitName?: string) {
  const named = explicitName?.trim()
  if (named) return named.slice(0, 120)

  if (userAgent?.trim()) {
    return userAgent.slice(0, 120)
  }

  return `Device ${deviceKey.slice(-6)}`
}

function mapDevice(doc: any, volume?: string) {
  const deviceKey = typeof doc.userId === 'string' && doc.userId.trim() ? doc.userId : normalizeDeviceKey()
  return {
    id: String(doc._id),
    volume: normalizeVolume(volume),
    deviceKey,
    name: doc.name,
    enabled: Boolean(doc.notifications),
    includePaths: [...DEFAULT_INCLUDE_PATHS],
    ignorePaths: [] as string[],
    endpoint: doc.endpoint,
    userAgent: undefined,
    hasSubscription: Boolean(doc.endpoint && doc.p256dh && doc.auth),
    createdAt: new Date(doc._creationTime ?? Date.now()).toISOString(),
    updatedAt: new Date(doc._creationTime ?? Date.now()).toISOString(),
  }
}

async function listDeviceRows(ctx: any) {
  return ctx.db.query('devices').collect()
}

async function findDeviceByKey(ctx: any, deviceKey: string) {
  const rows = await listDeviceRows(ctx)
  return rows.find((row: any) => row.userId === deviceKey)
}

async function ensureCurrentDevice(
  ctx: any,
  input: { volume?: string; deviceKey?: string; name?: string; userAgent?: string },
) {
  const deviceKey = normalizeDeviceKey(input.deviceKey)
  const existing = await findDeviceByKey(ctx, deviceKey)

  if (existing) {
    if (input.name?.trim()) {
      await ctx.db.patch(existing._id, {
        name: defaultDeviceName(deviceKey, input.userAgent, input.name),
      })
      const next = await ctx.db.get(existing._id)
      return next
    }
    return existing
  }

  const id = await ctx.db.insert('devices', {
    userId: deviceKey,
    name: defaultDeviceName(deviceKey, input.userAgent, input.name),
    notifications: false,
    endpoint: undefined,
    p256dh: undefined,
    auth: undefined,
  })

  return ctx.db.get(id)
}

export const ensureDefaultDevice = mutation({
  args: {
    volume: v.optional(v.string()),
    deviceKey: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const device = await ensureCurrentDevice(ctx, {
      volume: args.volume,
      deviceKey: args.deviceKey,
      userAgent: args.userAgent,
    })

    return mapDevice(device, args.volume)
  },
})

export const getOrCreateCurrentDevice = mutation({
  args: {
    volume: v.optional(v.string()),
    deviceKey: v.optional(v.string()),
    name: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const device = await ensureCurrentDevice(ctx, {
      volume: args.volume,
      deviceKey: args.deviceKey,
      name: args.name,
      userAgent: args.userAgent,
    })

    return {
      ...mapDevice(device, args.volume),
      isCurrent: true,
    }
  },
})

export const listDevices = query({
  args: {
    volume: v.optional(v.string()),
    deviceKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    const scopedDeviceKey = args.deviceKey ? normalizeDeviceKey(args.deviceKey) : undefined

    const rows = await listDeviceRows(ctx)
    const filtered = rows
      .filter((row: any) => (scopedDeviceKey ? row.userId === scopedDeviceKey : true))
      .sort((a: any, b: any) => Number(b._creationTime ?? 0) - Number(a._creationTime ?? 0))

    return filtered.map((row: any) => mapDevice(row, args.volume))
  },
})

export const createDevice = mutation({
  args: {
    volume: v.optional(v.string()),
    name: v.optional(v.string()),
    includePaths: v.optional(v.array(v.string())),
    ignorePaths: v.optional(v.array(v.string())),
    deviceKey: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    let deviceKey = args.deviceKey ? normalizeDeviceKey(args.deviceKey) : normalizeDeviceKey()
    const existing = await findDeviceByKey(ctx, deviceKey)
    if (existing) {
      deviceKey = normalizeDeviceKey()
    }

    const inserted = await ctx.db.insert('devices', {
      userId: deviceKey,
      name: defaultDeviceName(deviceKey, args.userAgent, args.name),
      notifications: false,
      endpoint: undefined,
      p256dh: undefined,
      auth: undefined,
    })

    const created = await ctx.db.get(inserted)
    return mapDevice(created, args.volume)
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
    await getAuthenticatedContext(ctx)

    const device = await ctx.db.get(args.deviceId)
    if (!device) {
      throw new Error('Device not found')
    }

    if (args.deviceKey && device.userId !== normalizeDeviceKey(args.deviceKey)) {
      throw new Error('Unauthorized device access')
    }

    const patch: Record<string, unknown> = {}

    if (typeof args.enabled === 'boolean') {
      patch.notifications = args.enabled
    }

    if (typeof args.name === 'string') {
      patch.name = defaultDeviceName(typeof device.userId === 'string' ? device.userId : 'device', undefined, args.name)
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.deviceId, patch)
    }

    const next = await ctx.db.get(args.deviceId)
    return mapDevice(next)
  },
})

export const ensurePathAlias = mutation({
  args: {
    volume: v.optional(v.string()),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

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
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    const volume = normalizeVolume(args.volume)
    const path = normalizeTopicPath(args.aliasId)

    if (!path) {
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
