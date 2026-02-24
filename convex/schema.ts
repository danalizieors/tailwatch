import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  events: defineTable({
    path: v.string(),
    segments: v.array(v.string()),
    type: v.union(
      v.literal('start'),
      v.literal('log'),
      v.literal('stop'),
      v.literal('error'),
      v.literal('heartbeat'),
      v.literal('status'),
    ),
    timestamp: v.string(),
    ingestedAt: v.string(),
    runId: v.optional(v.string()),
    entityId: v.optional(v.string()),
    entityType: v.optional(v.string()),
    level: v.optional(v.string()),
    status: v.optional(v.string()),
    content: v.optional(v.string()),
    meta: v.optional(v.any()),
    metrics: v.optional(v.any()),
  })
    .index('by_path', ['path'])
    .index('by_timestamp', ['timestamp'])
    .index('by_entity', ['entityId']),
  entity_state: defineTable({
    key: v.string(),
    path: v.string(),
    entityId: v.string(),
    entityType: v.string(),
    currentStatus: v.string(),
    currentRunId: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    lastSeenAt: v.string(),
    lastEventType: v.string(),
    lastContent: v.optional(v.string()),
    lastError: v.optional(v.string()),
  })
    .index('by_key', ['key'])
    .index('by_path', ['path'])
    .index('by_status', ['currentStatus']),
})
