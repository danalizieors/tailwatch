import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation } from './_generated/server'
import { getAuthenticatedContext } from './functions'

function normalizeDeviceKey(value?: string) {
  const next = value?.trim()
  if (!next) {
    return `device_${Math.random().toString(36).slice(2, 10)}`
  }
  return next.slice(0, 128)
}

function getEnv(name: string): string | undefined {
  const value = process.env[name]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function normalizeBase64Url(value: string) {
  return value.trim().replace(/=+$/g, '')
}

function getPushConfigStatus(clientVapidPublicKey?: string) {
  const missingConfig: string[] = []
  const privateKey = getEnv('VAPID_PRIVATE_KEY')
  const serverVapidPublicKey = getEnv('VAPID_PUBLIC_KEY') ?? getEnv('VITE_VAPID_PUBLIC_KEY')

  if (privateKey) {
    try {
      resolvePrivateJWK(privateKey, serverVapidPublicKey)
    } catch {
      missingConfig.push('INVALID_VAPID_KEY_CONFIGURATION')
    }
  }

  if (
    clientVapidPublicKey &&
    serverVapidPublicKey &&
    normalizeBase64Url(clientVapidPublicKey) !== normalizeBase64Url(serverVapidPublicKey)
  ) {
    missingConfig.push('VAPID_PUBLIC_KEY_MISMATCH')
  }

  return {
    configured: missingConfig.length === 0,
    missingConfig,
    serverVapidPublicKey,
  }
}

function resolvePrivateJWK(privateKey: string, publicKey?: string): JsonWebKey | string {
  const trimmed = privateKey.trim()

  // PushForge-native format: JWK JSON string.
  if (trimmed.startsWith('{')) {
    return privateKey
  }

  if (!publicKey) {
    throw new Error('VAPID_PUBLIC_KEY (or VITE_VAPID_PUBLIC_KEY) is required when VAPID_PRIVATE_KEY is not a JWK JSON string')
  }

  const publicBytes = base64UrlToBytes(publicKey)
  const privateBytes = base64UrlToBytes(privateKey)

  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY must be an uncompressed P-256 public key (base64url)')
  }
  if (privateBytes.length !== 32) {
    throw new Error('VAPID_PRIVATE_KEY must be a 32-byte P-256 private key (base64url) when not using JWK')
  }

  return {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(publicBytes.slice(1, 33)),
    y: bytesToBase64Url(publicBytes.slice(33, 65)),
    d: bytesToBase64Url(privateBytes),
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join('')
  const encoded = btoa(binary)
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

type PushSubscriptionRecord = {
  endpoint: string
  expirationTime?: number
  p256dh?: string
  auth?: string
  userAgent?: string
  updatedAt?: string
  deviceId?: string
  deviceKey?: string
  deviceName?: string
  enabled?: boolean
  includePaths?: string[]
  ignorePaths?: string[]
}

function mapPushSubscription(row: any): PushSubscriptionRecord {
  const deviceKey = typeof row.userId === 'string' && row.userId.trim() ? row.userId : normalizeDeviceKey()
  return {
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: undefined,
    updatedAt: new Date(row._creationTime ?? Date.now()).toISOString(),
    deviceId: String(row._id),
    deviceKey,
    deviceName: row.name,
    enabled: row.notifications,
    includePaths: ['/'],
    ignorePaths: [],
  }
}

async function listAllDeviceRows(ctx: any) {
  return ctx.db.query('devices').collect()
}

async function findDeviceByKey(ctx: any, deviceKey: string) {
  const rows = await listAllDeviceRows(ctx)
  return rows.find((row: any) => row.userId === deviceKey)
}

async function clearSubscriptionByEndpoint(ctx: any, endpoint: string) {
  const rows = await listAllDeviceRows(ctx)
  const matched = rows.filter((row: any) => row.endpoint === endpoint)

  for (const row of matched) {
    await ctx.db.patch(row._id, {
      endpoint: undefined,
      p256dh: undefined,
      auth: undefined,
      notifications: false,
    })
  }

  return matched.length
}

async function clearSubscriptionByDeviceKey(ctx: any, deviceKey: string) {
  const device = await findDeviceByKey(ctx, deviceKey)
  if (!device) return 0

  await ctx.db.patch(device._id, {
    endpoint: undefined,
    p256dh: undefined,
    auth: undefined,
    notifications: false,
  })
  return 1
}

export const upsertSubscription = mutation({
  args: {
    endpoint: v.string(),
    expirationTime: v.optional(v.number()),
    p256dh: v.optional(v.string()),
    auth: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    clientVapidPublicKey: v.optional(v.string()),
    deviceKey: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    const pushConfig = getPushConfigStatus(args.clientVapidPublicKey)

    const deviceKey = normalizeDeviceKey(args.deviceKey ?? args.endpoint)
    const deviceName = args.deviceName?.trim() ? args.deviceName.trim().slice(0, 120) : `Device ${deviceKey.slice(-6)}`

    const existing = await findDeviceByKey(ctx, deviceKey)
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: deviceKey,
        name: deviceName,
        notifications: typeof args.enabled === 'boolean' ? args.enabled : true,
        endpoint: args.endpoint,
        p256dh: args.p256dh,
        auth: args.auth,
      })

      return {
        ok: true,
        id: String(existing._id),
        updated: true,
        pushConfigured: pushConfig.configured,
        missingConfig: pushConfig.missingConfig,
        serverVapidPublicKey: pushConfig.serverVapidPublicKey,
      }
    }

    const createdId = await ctx.db.insert('devices', {
      userId: deviceKey,
      name: deviceName,
      notifications: typeof args.enabled === 'boolean' ? args.enabled : true,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
    })

    return {
      ok: true,
      id: String(createdId),
      updated: false,
      pushConfigured: pushConfig.configured,
      missingConfig: pushConfig.missingConfig,
      serverVapidPublicKey: pushConfig.serverVapidPublicKey,
    }
  },
})

export const removeSubscription = mutation({
  args: {
    endpoint: v.optional(v.string()),
    deviceKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    let deleted = 0

    if (args.deviceKey) {
      deleted += await clearSubscriptionByDeviceKey(ctx, normalizeDeviceKey(args.deviceKey))
    }

    if (args.endpoint) {
      deleted += await clearSubscriptionByEndpoint(ctx, args.endpoint)
    }

    return { ok: true, deleted }
  },
})

export const removeSubscriptionInternal = internalMutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const deleted = await clearSubscriptionByEndpoint(ctx, args.endpoint)
    return { ok: true, deleted }
  },
})

export const listSubscriptionsForVolumeInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await listAllDeviceRows(ctx)
    return rows.filter((row: any) => row.endpoint).map(mapPushSubscription)
  },
})
