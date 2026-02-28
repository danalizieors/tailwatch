import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { getAuthenticatedContext } from './functions'

const DEFAULT_WORKSPACE = 'personal'
const DEFAULT_INCLUDE_PATHS = ['/']

function normalizeWorkspace(value?: string) {
  const next = value?.trim()
  return next || DEFAULT_WORKSPACE
}

function normalizeTopicPath(value: string) {
  return value.replace(/^\/+|\/+$/g, '').replace(/\/+$/g, '').replace(/\/+/g, '/')
}

function normalizeWatcherKey(value?: string) {
  const next = value?.trim()
  if (!next) {
    return `watcher_${Math.random().toString(36).slice(2, 10)}`
  }
  return next.slice(0, 128)
}

function defaultWatcherName(watcherKey: string, userAgent?: string, explicitName?: string) {
  const named = explicitName?.trim()
  if (named) return named.slice(0, 120)

  if (userAgent?.trim()) {
    return userAgent.slice(0, 120)
  }

  return `Device ${watcherKey.slice(-6)}`
}

function mapWatcher(doc: any, workspace?: string) {
  const watcherKey = typeof doc.userId === 'string' && doc.userId.trim() ? doc.userId : normalizeWatcherKey()
  return {
    id: String(doc._id),
    workspace: normalizeWorkspace(workspace),
    watcherKey,
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

async function findDeviceByWatcherKey(ctx: any, watcherKey: string) {
  const rows = await listDeviceRows(ctx)
  return rows.find((row: any) => row.userId === watcherKey)
}

async function ensureCurrentWatcher(
  ctx: any,
  input: { workspace?: string; watcherKey?: string; name?: string; userAgent?: string },
) {
  const watcherKey = normalizeWatcherKey(input.watcherKey)
  const existing = await findDeviceByWatcherKey(ctx, watcherKey)

  if (existing) {
    if (input.name?.trim()) {
      await ctx.db.patch(existing._id, {
        name: defaultWatcherName(watcherKey, input.userAgent, input.name),
      })
      const next = await ctx.db.get(existing._id)
      return next
    }
    return existing
  }

  const id = await ctx.db.insert('devices', {
    userId: watcherKey,
    name: defaultWatcherName(watcherKey, input.userAgent, input.name),
    notifications: false,
    endpoint: undefined,
    p256dh: undefined,
    auth: undefined,
  })

  return ctx.db.get(id)
}

export const ensureDefaultWatcher = mutation({
  args: {
    workspace: v.optional(v.string()),
    watcherKey: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const watcher = await ensureCurrentWatcher(ctx, {
      workspace: args.workspace,
      watcherKey: args.watcherKey,
      userAgent: args.userAgent,
    })

    return mapWatcher(watcher, args.workspace)
  },
})

export const getOrCreateCurrentWatcher = mutation({
  args: {
    workspace: v.optional(v.string()),
    watcherKey: v.optional(v.string()),
    name: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const watcher = await ensureCurrentWatcher(ctx, {
      workspace: args.workspace,
      watcherKey: args.watcherKey,
      name: args.name,
      userAgent: args.userAgent,
    })

    return {
      ...mapWatcher(watcher, args.workspace),
      isCurrent: true,
    }
  },
})

export const listWatchers = query({
  args: {
    workspace: v.optional(v.string()),
    watcherKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    const scopedWatcherKey = args.watcherKey ? normalizeWatcherKey(args.watcherKey) : undefined

    const rows = await listDeviceRows(ctx)
    const filtered = rows
      .filter((row: any) => (scopedWatcherKey ? row.userId === scopedWatcherKey : true))
      .sort((a: any, b: any) => Number(b._creationTime ?? 0) - Number(a._creationTime ?? 0))

    return filtered.map((row: any) => mapWatcher(row, args.workspace))
  },
})

export const createWatcher = mutation({
  args: {
    workspace: v.optional(v.string()),
    name: v.optional(v.string()),
    includePaths: v.optional(v.array(v.string())),
    ignorePaths: v.optional(v.array(v.string())),
    watcherKey: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    let watcherKey = args.watcherKey ? normalizeWatcherKey(args.watcherKey) : normalizeWatcherKey()
    const existing = await findDeviceByWatcherKey(ctx, watcherKey)
    if (existing) {
      watcherKey = normalizeWatcherKey()
    }

    const inserted = await ctx.db.insert('devices', {
      userId: watcherKey,
      name: defaultWatcherName(watcherKey, args.userAgent, args.name),
      notifications: false,
      endpoint: undefined,
      p256dh: undefined,
      auth: undefined,
    })

    const created = await ctx.db.get(inserted)
    return mapWatcher(created, args.workspace)
  },
})

export const updateWatcher = mutation({
  args: {
    watcherId: v.id('devices'),
    enabled: v.optional(v.boolean()),
    name: v.optional(v.string()),
    includePaths: v.optional(v.array(v.string())),
    ignorePaths: v.optional(v.array(v.string())),
    watcherKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const watcher = await ctx.db.get(args.watcherId)
    if (!watcher) {
      throw new Error('Device not found')
    }

    if (args.watcherKey && watcher.userId !== normalizeWatcherKey(args.watcherKey)) {
      throw new Error('Unauthorized device access')
    }

    const patch: Record<string, unknown> = {}

    if (typeof args.enabled === 'boolean') {
      patch.notifications = args.enabled
    }

    if (typeof args.name === 'string') {
      patch.name = defaultWatcherName(typeof watcher.userId === 'string' ? watcher.userId : 'watcher', undefined, args.name)
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.watcherId, patch)
    }

    const next = await ctx.db.get(args.watcherId)
    return mapWatcher(next)
  },
})

export const ensurePathAlias = mutation({
  args: {
    workspace: v.optional(v.string()),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const workspace = normalizeWorkspace(args.workspace)
    const path = normalizeTopicPath(args.path)

    return {
      aliasId: path,
      path,
      workspace,
      created: false,
    }
  },
})

export const resolvePathAlias = query({
  args: {
    workspace: v.optional(v.string()),
    aliasId: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)
    const workspace = normalizeWorkspace(args.workspace)
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
      workspace,
    }
  },
})

export const ensurePathAliasInternal = internalMutation({
  args: {
    workspace: v.optional(v.string()),
    path: v.string(),
  },
  handler: async (_ctx, args) => {
    const workspace = normalizeWorkspace(args.workspace)
    const path = normalizeTopicPath(args.path)

    return {
      aliasId: path,
      path,
      workspace,
      created: false,
    }
  },
})

export const listPushTargetsForPathInternal = internalQuery({
  args: {
    workspace: v.optional(v.string()),
    path: v.string(),
  },
  handler: async (ctx) => {
    const rows = await listDeviceRows(ctx)

    return rows
      .filter((row: any) => row.notifications && row.endpoint && row.p256dh && row.auth)
      .map((row: any) => ({
        watcherId: String(row._id),
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        expirationTime: undefined,
        workspace: undefined,
        userAgent: undefined,
        updatedAt: new Date(row._creationTime ?? Date.now()).toISOString(),
      }))
  },
})
