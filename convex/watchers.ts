import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { getAuthenticatedContext } from './functions'

const DEFAULT_WORKSPACE = 'default'
const DEFAULT_INCLUDE_PATHS = ['/']
const MAX_RULE_PATHS = 32
const MAX_ALIAS_ID_ATTEMPTS = 8

function normalizeWorkspace(value?: string) {
  const next = value?.trim()
  return next || DEFAULT_WORKSPACE
}

function normalizeTopicPath(value: string) {
  return value.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function normalizeRulePath(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return '/'
  const normalized = normalizeTopicPath(trimmed)
  if (!normalized) return '/'

  const segments = normalized.split('/').filter(Boolean)
  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      throw new Error('Invalid watcher rule segment')
    }
  }

  return normalized
}

function normalizeRuleList(paths?: string[]) {
  const deduped = new Set<string>()
  for (const raw of paths ?? []) {
    const next = normalizeRulePath(raw)
    deduped.add(next)
    if (deduped.size >= MAX_RULE_PATHS) break
  }

  if (deduped.size === 0) {
    return [...DEFAULT_INCLUDE_PATHS]
  }

  return Array.from(deduped)
}

function normalizeIgnoreRuleList(paths?: string[]) {
  const deduped = new Set<string>()
  for (const raw of paths ?? []) {
    const next = normalizeRulePath(raw)
    if (next === '/') continue
    deduped.add(next)
    if (deduped.size >= MAX_RULE_PATHS) break
  }
  return Array.from(deduped)
}

function normalizeWatcherKey(value?: string) {
  const next = value?.trim()
  if (!next) {
    return `watcher_${Math.random().toString(36).slice(2, 10)}`
  }
  return next.slice(0, 128)
}

function randomAliasId() {
  return Math.random().toString(36).slice(2, 10)
}

function defaultWatcherName(watcherKey: string, userAgent?: string, explicitName?: string) {
  const named = explicitName?.trim()
  if (named) return named.slice(0, 120)

  if (userAgent?.trim()) {
    return userAgent.slice(0, 120)
  }

  return `Watcher ${watcherKey.slice(-6)}`
}

function pathMatchesRule(pathValue: string, rawRule: string) {
  const normalizedPath = normalizeTopicPath(pathValue)
  const rule = normalizeRulePath(rawRule)
  if (rule === '/') return true
  return normalizedPath === rule || normalizedPath.startsWith(`${rule}/`)
}

function watcherAllowsPath(
  watcher: {
    enabled: boolean
    includePaths?: string[]
    ignorePaths?: string[]
  },
  eventPath: string,
) {
  if (!watcher.enabled) return false

  const includePaths = normalizeRuleList(watcher.includePaths)
  const ignorePaths = normalizeIgnoreRuleList(watcher.ignorePaths)

  if (ignorePaths.some((rule) => pathMatchesRule(eventPath, rule))) {
    return false
  }

  return includePaths.some((rule) => pathMatchesRule(eventPath, rule))
}

function mapWatcher(doc: any) {
  return {
    id: String(doc._id),
    workspace: doc.workspace ?? DEFAULT_WORKSPACE,
    watcherKey: doc.watcherKey,
    name: doc.name,
    enabled: Boolean(doc.enabled),
    includePaths: normalizeRuleList(Array.isArray(doc.includePaths) ? doc.includePaths : undefined),
    ignorePaths: normalizeIgnoreRuleList(Array.isArray(doc.ignorePaths) ? doc.ignorePaths : undefined),
    endpoint: doc.endpoint,
    userAgent: doc.userAgent,
    hasSubscription: Boolean(doc.endpoint && doc.p256dh && doc.auth),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function canAccessWatcher(
  row: any,
  owner: {
    userId?: string
    watcherKey?: string
  },
) {
  if (owner.userId) {
    return row.userId === owner.userId
  }

  if (row.userId) return false
  if (!owner.watcherKey) return false

  return row.watcherKey === owner.watcherKey
}

async function findWatcherByWorkspaceAndKey(ctx: any, workspace: string, watcherKey: string) {
  return ctx.db
    .query('watchers')
    .withIndex('by_workspace_watcher_key', (q: any) => q.eq('workspace', workspace).eq('watcherKey', watcherKey))
    .first()
}

async function ensureCurrentWatcher(ctx: any, input: { workspace?: string; watcherKey?: string; name?: string; userAgent?: string }, owner: { userId?: string }) {
  const workspace = normalizeWorkspace(input.workspace)
  const watcherKey = normalizeWatcherKey(input.watcherKey)
  const now = new Date().toISOString()

  const existing = await findWatcherByWorkspaceAndKey(ctx, workspace, watcherKey)
  if (existing) {
    const patch: Record<string, unknown> = {
      updatedAt: now,
    }

    if (input.name?.trim()) {
      patch.name = defaultWatcherName(watcherKey, input.userAgent, input.name)
    }

    if (input.userAgent?.trim()) {
      patch.userAgent = input.userAgent.slice(0, 400)
    }

    // If the browser session became authenticated, bind the watcher to the user.
    if (!existing.userId && owner.userId) {
      patch.userId = owner.userId
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch)
      return {
        ...existing,
        ...patch,
      }
    }

    return existing
  }

  const watcher = {
    workspace,
    watcherKey,
    name: defaultWatcherName(watcherKey, input.userAgent, input.name),
    enabled: false,
    includePaths: [...DEFAULT_INCLUDE_PATHS],
    ignorePaths: [] as string[],
    endpoint: undefined,
    expirationTime: undefined,
    p256dh: undefined,
    auth: undefined,
    userAgent: input.userAgent?.trim() ? input.userAgent.slice(0, 400) : undefined,
    userId: owner.userId,
    createdAt: now,
    updatedAt: now,
  }

  const id = await ctx.db.insert('watchers', watcher)
  return {
    _id: id,
    ...watcher,
  }
}

async function ensurePathAliasRecord(
  ctx: any,
  input: {
    workspace?: string
    path: string
    userId?: string
  },
) {
  const workspace = normalizeWorkspace(input.workspace)
  const path = normalizeRulePath(input.path)
  const now = new Date().toISOString()

  const existing = await ctx.db
    .query('path_aliases')
    .withIndex('by_workspace_path', (q: any) => q.eq('workspace', workspace).eq('path', path))
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, { updatedAt: now })
    return {
      aliasId: existing.aliasId,
      path: existing.path,
      workspace,
      created: false,
    }
  }

  let aliasId = randomAliasId()
  for (let attempt = 0; attempt < MAX_ALIAS_ID_ATTEMPTS; attempt += 1) {
    const conflict = await ctx.db
      .query('path_aliases')
      .withIndex('by_workspace_alias', (q: any) => q.eq('workspace', workspace).eq('aliasId', aliasId))
      .first()

    if (!conflict) {
      await ctx.db.insert('path_aliases', {
        workspace,
        path,
        aliasId,
        createdAt: now,
        updatedAt: now,
        userId: input.userId,
      })

      return {
        aliasId,
        path,
        workspace,
        created: true,
      }
    }

    aliasId = randomAliasId()
  }

  throw new Error('Unable to allocate a unique alias id')
}

export const ensureDefaultWatcher = mutation({
  args: {
    workspace: v.optional(v.string()),
    watcherKey: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const ownerUserId = authCtx.userId ? String(authCtx.userId) : undefined
    const workspace = normalizeWorkspace(args.workspace)

    const rows = await ctx.db
      .query('watchers')
      .withIndex('by_workspace', (q: any) => q.eq('workspace', workspace))
      .collect()

    const ownerRows = rows.filter((row: any) => {
      if (ownerUserId) return row.userId === ownerUserId
      return !row.userId && args.watcherKey && row.watcherKey === normalizeWatcherKey(args.watcherKey)
    })

    if (ownerRows.length > 0) {
      const newest = [...ownerRows].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0]
      return mapWatcher(newest)
    }

    const watcher = await ensureCurrentWatcher(
      ctx,
      {
        workspace,
        watcherKey: args.watcherKey,
        userAgent: args.userAgent,
      },
      { userId: ownerUserId },
    )

    return mapWatcher(watcher)
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
    const authCtx = await getAuthenticatedContext(ctx)
    const ownerUserId = authCtx.userId ? String(authCtx.userId) : undefined

    const watcher = await ensureCurrentWatcher(
      ctx,
      {
        workspace: args.workspace,
        watcherKey: args.watcherKey,
        name: args.name,
        userAgent: args.userAgent,
      },
      { userId: ownerUserId },
    )

    return {
      ...mapWatcher(watcher),
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
    const authCtx = await getAuthenticatedContext(ctx)
    const ownerUserId = authCtx.userId ? String(authCtx.userId) : undefined
    const workspace = normalizeWorkspace(args.workspace)
    const scopedWatcherKey = args.watcherKey ? normalizeWatcherKey(args.watcherKey) : undefined

    const rows = await ctx.db
      .query('watchers')
      .withIndex('by_workspace', (q: any) => q.eq('workspace', workspace))
      .collect()

    const ownerRows = rows
      .filter((row: any) => {
        if (ownerUserId) return row.userId === ownerUserId
        if (!scopedWatcherKey) return false
        return !row.userId && row.watcherKey === scopedWatcherKey
      })
      .sort((a: any, b: any) => String(b.updatedAt).localeCompare(String(a.updatedAt)))

    return ownerRows.map(mapWatcher)
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
    const authCtx = await getAuthenticatedContext(ctx)
    const ownerUserId = authCtx.userId ? String(authCtx.userId) : undefined
    const workspace = normalizeWorkspace(args.workspace)
    const now = new Date().toISOString()

    let watcherKey = args.watcherKey ? normalizeWatcherKey(args.watcherKey) : normalizeWatcherKey()
    const watcherWithSameKey = await findWatcherByWorkspaceAndKey(ctx, workspace, watcherKey)
    if (watcherWithSameKey) {
      watcherKey = normalizeWatcherKey()
    }
    const includePaths = normalizeRuleList(args.includePaths)
    const ignorePaths = normalizeIgnoreRuleList(args.ignorePaths)

    const inserted = await ctx.db.insert('watchers', {
      workspace,
      watcherKey,
      name: defaultWatcherName(watcherKey, args.userAgent, args.name),
      enabled: false,
      includePaths,
      ignorePaths,
      endpoint: undefined,
      expirationTime: undefined,
      p256dh: undefined,
      auth: undefined,
      userAgent: args.userAgent?.trim() ? args.userAgent.slice(0, 400) : undefined,
      userId: ownerUserId,
      createdAt: now,
      updatedAt: now,
    })

    const created = await ctx.db.get(inserted)
    return mapWatcher(created)
  },
})

export const updateWatcher = mutation({
  args: {
    watcherId: v.id('watchers'),
    enabled: v.optional(v.boolean()),
    name: v.optional(v.string()),
    includePaths: v.optional(v.array(v.string())),
    ignorePaths: v.optional(v.array(v.string())),
    watcherKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const ownerUserId = authCtx.userId ? String(authCtx.userId) : undefined
    const watcher = await ctx.db.get(args.watcherId)

    if (!watcher) {
      throw new Error('Watcher not found')
    }

    if (!canAccessWatcher(watcher, { userId: ownerUserId, watcherKey: args.watcherKey })) {
      throw new Error('Unauthorized watcher access')
    }

    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    }

    if (typeof args.enabled === 'boolean') {
      patch.enabled = args.enabled
    }

    if (typeof args.name === 'string') {
      patch.name = defaultWatcherName(watcher.watcherKey, watcher.userAgent, args.name)
    }

    if (Array.isArray(args.includePaths)) {
      patch.includePaths = normalizeRuleList(args.includePaths)
    }

    if (Array.isArray(args.ignorePaths)) {
      patch.ignorePaths = normalizeIgnoreRuleList(args.ignorePaths)
    }

    await ctx.db.patch(args.watcherId, patch)
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
    const authCtx = await getAuthenticatedContext(ctx)
    const ownerUserId = authCtx.userId ? String(authCtx.userId) : undefined
    return ensurePathAliasRecord(ctx, {
      workspace: args.workspace,
      path: args.path,
      userId: ownerUserId,
    })
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
    const aliasId = args.aliasId.trim()

    if (!aliasId) {
      return {
        found: false,
      }
    }

    const row = await ctx.db
      .query('path_aliases')
      .withIndex('by_workspace_alias', (q: any) => q.eq('workspace', workspace).eq('aliasId', aliasId))
      .first()

    if (!row) {
      return {
        found: false,
      }
    }

    return {
      found: true,
      path: row.path,
      aliasId: row.aliasId,
      workspace,
    }
  },
})

export const ensurePathAliasInternal = internalMutation({
  args: {
    workspace: v.optional(v.string()),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    return ensurePathAliasRecord(ctx, {
      workspace: args.workspace,
      path: args.path,
    })
  },
})

export const listPushTargetsForPathInternal = internalQuery({
  args: {
    workspace: v.optional(v.string()),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = normalizeWorkspace(args.workspace)
    const eventPath = normalizeTopicPath(args.path)

    const rows = await ctx.db
      .query('watchers')
      .withIndex('by_workspace', (q: any) => q.eq('workspace', workspace))
      .collect()

    return rows
      .filter((row: any) => row.endpoint && row.p256dh && row.auth)
      .filter((row: any) => watcherAllowsPath(row, eventPath))
      .map((row: any) => ({
        watcherId: String(row._id),
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        expirationTime: row.expirationTime,
        workspace: row.workspace,
        userAgent: row.userAgent,
        updatedAt: row.updatedAt,
      }))
  },
})
