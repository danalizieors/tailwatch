import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { getAuthenticatedContext } from './functions'

const DEFAULT_WORKSPACE = 'default'
const DEFAULT_INCLUDE_PATHS = ['/']

function normalizeWorkspace(value?: string) {
  const next = value?.trim()
  return next || DEFAULT_WORKSPACE
}

function normalizeWatcherKey(value?: string) {
  const next = value?.trim()
  if (!next) {
    return `watcher_${Math.random().toString(36).slice(2, 10)}`
  }
  return next.slice(0, 128)
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  const next: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) next[key] = entry
  }
  return next
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
  workspace?: string
  userAgent?: string
  updatedAt?: string
  watcherId?: string
  watcherKey?: string
  watcherName?: string
  enabled?: boolean
  includePaths?: string[]
  ignorePaths?: string[]
}

function mapPushSubscription(row: any): PushSubscriptionRecord {
  return {
    endpoint: row.endpoint,
    expirationTime: row.expirationTime,
    p256dh: row.p256dh,
    auth: row.auth,
    workspace: row.workspace,
    userAgent: row.userAgent,
    updatedAt: row.updatedAt,
    watcherId: String(row._id),
    watcherKey: row.watcherKey,
    watcherName: row.name,
    enabled: row.enabled,
    includePaths: Array.isArray(row.includePaths) ? row.includePaths : [...DEFAULT_INCLUDE_PATHS],
    ignorePaths: Array.isArray(row.ignorePaths) ? row.ignorePaths : [],
  }
}

function isOwnerAuthorized(row: any, ownerUserId?: string, scopedWatcherKey?: string) {
  if (ownerUserId) {
    return row.userId === ownerUserId
  }

  if (row.userId) return false

  if (!scopedWatcherKey) return false

  return row.watcherKey === scopedWatcherKey
}

async function dedupSubscriptions(rows: any[]) {
  const deduped = new Map<string, any>()
  for (const row of rows) {
    if (!row.endpoint) continue

    const existing = deduped.get(row.endpoint)
    if (!existing) {
      deduped.set(row.endpoint, row)
      continue
    }

    const currentTs = Date.parse(String(existing.updatedAt ?? existing.createdAt ?? 0)) || 0
    const nextTs = Date.parse(String(row.updatedAt ?? row.createdAt ?? 0)) || 0
    if (nextTs >= currentTs) {
      deduped.set(row.endpoint, row)
    }
  }

  return Array.from(deduped.values()).map(mapPushSubscription)
}

async function listSubscriptionsByWorkspace(ctx: any, workspace: string, owner?: { userId?: string; watcherKey?: string }) {
  const rows = await ctx.db
    .query('watchers')
    .withIndex('by_workspace', (q: any) => q.eq('workspace', workspace))
    .collect()

  const scoped = rows.filter((row: any) => {
    if (!row.endpoint) return false
    if (!owner) return true
    return isOwnerAuthorized(row, owner.userId, owner.watcherKey)
  })

  return dedupSubscriptions(scoped)
}

async function clearLegacySubscriptionsByEndpoint(ctx: any, endpoint: string) {
  const rows = await ctx.db
    .query('push_subscriptions')
    .withIndex('by_endpoint', (q: any) => q.eq('endpoint', endpoint))
    .collect()

  for (const row of rows) {
    await ctx.db.delete(row._id)
  }

  return rows.length
}

async function clearWatcherSubscriptionByEndpoint(ctx: any, endpoint: string, workspace?: string) {
  const rows = workspace
    ? await ctx.db
        .query('watchers')
        .withIndex('by_workspace', (q: any) => q.eq('workspace', workspace))
        .collect()
    : await ctx.db.query('watchers').collect()

  const matched = rows.filter((row: any) => row.endpoint === endpoint)

  for (const row of matched) {
    await ctx.db.patch(row._id, {
      endpoint: undefined,
      expirationTime: undefined,
      p256dh: undefined,
      auth: undefined,
      enabled: false,
      updatedAt: new Date().toISOString(),
    })
  }

  return matched.length
}

async function clearWatcherSubscriptionByKey(
  ctx: any,
  input: { workspace: string; watcherKey: string; ownerUserId?: string; requiresOwnerCheck: boolean },
) {
  const watcher = await ctx.db
    .query('watchers')
    .withIndex('by_workspace_watcher_key', (q: any) => q.eq('workspace', input.workspace).eq('watcherKey', input.watcherKey))
    .first()

  if (!watcher) {
    return 0
  }

  if (input.requiresOwnerCheck && !isOwnerAuthorized(watcher, input.ownerUserId, input.watcherKey)) {
    return 0
  }

  await ctx.db.patch(watcher._id, {
    endpoint: undefined,
    expirationTime: undefined,
    p256dh: undefined,
    auth: undefined,
    enabled: false,
    updatedAt: new Date().toISOString(),
  })

  return 1
}

export const upsertSubscription = mutation({
  args: {
    endpoint: v.string(),
    workspace: v.optional(v.string()),
    expirationTime: v.optional(v.number()),
    p256dh: v.optional(v.string()),
    auth: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    clientVapidPublicKey: v.optional(v.string()),
    watcherKey: v.optional(v.string()),
    watcherName: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const pushConfig = getPushConfigStatus(args.clientVapidPublicKey)
    const now = new Date().toISOString()
    const workspace = normalizeWorkspace(args.workspace)
    const userId = authCtx.userId ? String(authCtx.userId) : undefined
    const watcherKey = normalizeWatcherKey(args.watcherKey ?? args.endpoint)

    const existing = await ctx.db
      .query('watchers')
      .withIndex('by_workspace_watcher_key', (q: any) => q.eq('workspace', workspace).eq('watcherKey', watcherKey))
      .first()

    if (existing?.userId && userId && existing.userId !== userId) {
      throw new Error('Watcher key is already bound to another user')
    }

    const patch = omitUndefined({
      workspace,
      watcherKey,
      name: args.watcherName?.trim() ? args.watcherName.trim().slice(0, 120) : undefined,
      endpoint: args.endpoint,
      expirationTime: args.expirationTime,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent,
      userId,
      enabled: typeof args.enabled === 'boolean' ? args.enabled : true,
      updatedAt: now,
    })

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return {
        ok: true,
        id: String(existing._id),
        updated: true,
        pushConfigured: pushConfig.configured,
        missingConfig: pushConfig.missingConfig,
        serverVapidPublicKey: pushConfig.serverVapidPublicKey,
      }
    }

    const createdId = await ctx.db.insert('watchers', {
      ...(patch as any),
      workspace,
      watcherKey,
      name: args.watcherName?.trim() ? args.watcherName.trim().slice(0, 120) : `Watcher ${watcherKey.slice(-6)}`,
      enabled: typeof args.enabled === 'boolean' ? args.enabled : true,
      includePaths: [...DEFAULT_INCLUDE_PATHS],
      ignorePaths: [],
      endpoint: args.endpoint,
      expirationTime: args.expirationTime,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent,
      userId,
      updatedAt: now,
      createdAt: now,
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
    workspace: v.optional(v.string()),
    watcherKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const ownerUserId = authCtx.userId ? String(authCtx.userId) : undefined

    const workspace = normalizeWorkspace(args.workspace)
    const watcherKey = args.watcherKey ? normalizeWatcherKey(args.watcherKey) : undefined

    let deleted = 0

    if (watcherKey) {
      deleted += await clearWatcherSubscriptionByKey(ctx, {
        workspace,
        watcherKey,
        ownerUserId,
        requiresOwnerCheck: true,
      })
    }

    if (args.endpoint) {
      const scopedRows = await ctx.db
        .query('watchers')
        .withIndex('by_workspace', (q: any) => q.eq('workspace', workspace))
        .collect()

      for (const row of scopedRows) {
        if (row.endpoint !== args.endpoint) continue
        if (!isOwnerAuthorized(row, ownerUserId, watcherKey)) continue
        await ctx.db.patch(row._id, {
          endpoint: undefined,
          expirationTime: undefined,
          p256dh: undefined,
          auth: undefined,
          enabled: false,
          updatedAt: new Date().toISOString(),
        })
        deleted += 1
      }

      deleted += await clearLegacySubscriptionsByEndpoint(ctx, args.endpoint)
    }

    return { ok: true, deleted }
  },
})

export const removeSubscriptionInternal = internalMutation({
  args: {
    endpoint: v.string(),
    workspace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = args.workspace ? normalizeWorkspace(args.workspace) : undefined
    const deletedWatchers = await clearWatcherSubscriptionByEndpoint(ctx, args.endpoint, workspace)
    const deletedLegacy = await clearLegacySubscriptionsByEndpoint(ctx, args.endpoint)
    return { ok: true, deleted: deletedWatchers + deletedLegacy }
  },
})

export const listSubscriptionsForWorkspaceInternal = internalQuery({
  args: {
    workspace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workspace = normalizeWorkspace(args.workspace)
    return listSubscriptionsByWorkspace(ctx, workspace)
  },
})

export const listSubscriptionsForWorkspace = query({
  args: {
    workspace: v.optional(v.string()),
    watcherKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const ownerUserId = authCtx.userId ? String(authCtx.userId) : undefined

    const workspace = normalizeWorkspace(args.workspace)
    const watcherKey = args.watcherKey ? normalizeWatcherKey(args.watcherKey) : undefined

    return listSubscriptionsByWorkspace(ctx, workspace, {
      userId: ownerUserId,
      watcherKey,
    })
  },
})
