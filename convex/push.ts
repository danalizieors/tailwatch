import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getAuthenticatedContext } from './functions'

function normalizeWorkspace(value?: string) {
  const next = value?.trim()
  return next || 'default'
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  const next: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) next[key] = entry
  }
  return next
}

export const upsertSubscription = mutation({
  args: {
    endpoint: v.string(),
    workspace: v.optional(v.string()),
    expirationTime: v.optional(v.number()),
    p256dh: v.optional(v.string()),
    auth: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authCtx = await getAuthenticatedContext(ctx)
    const now = new Date().toISOString()
    const workspace = normalizeWorkspace(args.workspace)
    const userId = authCtx.userId ? String(authCtx.userId) : undefined

    const patch = omitUndefined({
      endpoint: args.endpoint,
      workspace,
      expirationTime: args.expirationTime,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent,
      userId,
      updatedAt: now,
    })

    const existing = await ctx.db
      .query('push_subscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return { ok: true, id: String(existing._id), updated: true }
    }

    const createdId = await ctx.db.insert('push_subscriptions', {
      ...patch,
      createdAt: now,
    })

    return { ok: true, id: String(createdId), updated: false }
  },
})

export const removeSubscription = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const rows = await ctx.db
      .query('push_subscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .collect()

    for (const row of rows) {
      await ctx.db.delete(row._id)
    }

    return { ok: true, deleted: rows.length }
  },
})

export const listSubscriptionsForWorkspace = query({
  args: {
    workspace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthenticatedContext(ctx)

    const workspace = normalizeWorkspace(args.workspace)
    const rows = await ctx.db
      .query('push_subscriptions')
      .withIndex('by_workspace', (q) => q.eq('workspace', workspace))
      .collect()

    return rows.map((row) => ({
      endpoint: row.endpoint,
      expirationTime: row.expirationTime,
      p256dh: row.p256dh,
      auth: row.auth,
      workspace: row.workspace,
      userAgent: row.userAgent,
      updatedAt: row.updatedAt,
    }))
  },
})
