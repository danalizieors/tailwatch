import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  authAccounts: authTables.authAccounts,
  authRateLimits: authTables.authRateLimits,
  authRefreshTokens: authTables.authRefreshTokens,
  authSessions: authTables.authSessions,
  authVerificationCodes: authTables.authVerificationCodes,
  authVerifiers: authTables.authVerifiers,
  users: defineTable({
    ...authTables.users.validator.fields,
    apiKey: v.optional(v.string()),
    defaultVolume: v.optional(v.string()),
    advancedMode: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  volumes: defineTable({
    slug: v.string(),
    name: v.string(),
    ownerUserId: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_slug', ['slug'])
    .index('by_owner', ['ownerUserId']),
  bindings: defineTable({
    workspace: v.optional(v.string()),
    route: v.string(),
    targetPath: v.string(),
    keyHash: v.string(),
    enabled: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
    createdByUserId: v.optional(v.string()),
  })
    .index('by_workspace_route', ['workspace', 'route'])
    .index('by_key_hash', ['keyHash'])
    .index('by_workspace', ['workspace']),
  paths: defineTable({
    workspace: v.optional(v.string()),
    key: v.string(),
    path: v.string(),
    segments: v.array(v.string()),
    status: v.union(v.literal('busy'), v.literal('idle')),
    lastTime: v.string(),
    lastIngestedAt: v.string(),
    lastContent: v.optional(v.string()),
    userId: v.optional(v.string()),
  })
    .index('by_workspace', ['workspace'])
    .index('by_workspace_path', ['workspace', 'path'])
    .index('by_workspace_status', ['workspace', 'status'])
    .index('by_workspace_last_ingested', ['workspace', 'lastIngestedAt']),
  events: defineTable({
    workspace: v.optional(v.string()),
    pathId: v.optional(v.string()),
    path: v.string(),
    segments: v.array(v.string()),
    time: v.string(),
    ingestedAt: v.string(),
    status: v.union(v.literal('busy'), v.literal('idle')),
    userId: v.optional(v.string()),
    content: v.optional(v.string()),
    submittedPath: v.optional(v.string()),
  })
    .index('by_workspace_time', ['workspace', 'time'])
    .index('by_workspace_ingestedAt', ['workspace', 'ingestedAt'])
    .index('by_workspace_path', ['workspace', 'path'])
    .index('by_time', ['time']),
  push_subscriptions: defineTable({
    endpoint: v.string(),
    workspace: v.optional(v.string()),
    expirationTime: v.optional(v.number()),
    p256dh: v.optional(v.string()),
    auth: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    userId: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_endpoint', ['endpoint'])
    .index('by_workspace', ['workspace']),
});
