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
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  events: defineTable({
    workspace: v.optional(v.string()),
    path: v.string(),
    segments: v.array(v.string()),
    type: v.optional(v.union(
      v.literal('start'),
      v.literal('log'),
      v.literal('stop'),
      v.literal('error'),
      v.literal('heartbeat'),
      v.literal('status'),
    )),
    timestamp: v.optional(v.any()),
    ingestedAt: v.any(),
    time: v.optional(v.any()),
    userId: v.optional(v.string()),
    runId: v.optional(v.string()),
    entityId: v.optional(v.string()),
    entityType: v.optional(v.string()),
    level: v.optional(v.string()),
    status: v.optional(v.string()),
    content: v.optional(v.string()),
    meta: v.optional(v.any()),
    metrics: v.optional(v.any()),
    _tempSync: v.optional(v.string()),
  })
    .index('by_workspace_timestamp', ['workspace', 'timestamp'])
    .index('by_path', ['path'])
    .index('by_timestamp', ['timestamp'])
    .index('by_entity', ['entityId']),
  entity_state: defineTable({
    workspace: v.optional(v.string()),
    key: v.optional(v.string()),
    path: v.string(),
    entityId: v.optional(v.string()),
    entityType: v.optional(v.string()),
    currentStatus: v.string(),
    currentRunId: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    lastSeenAt: v.any(),
    lastEventType: v.optional(v.string()),
    lastContent: v.optional(v.string()),
    lastError: v.optional(v.string()),
    userId: v.optional(v.string()),
  })
    .index('by_workspace', ['workspace'])
    .index('by_key', ['key'])
    .index('by_path', ['path'])
    .index('by_status', ['currentStatus']),
});
