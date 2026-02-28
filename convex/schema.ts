import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,
  volumes: defineTable({
    userId: v.optional(v.string()),
    name: v.string(),
    key: v.optional(v.string()),
    keyEnabled: v.optional(v.boolean()),
  })
    .index('by_user_and_name', ['userId', 'name'])
    .index('by_key', ['key'])
    .index('by_user', ['userId']),
  paths: defineTable({
    volumeId: v.optional(v.string()),
    path: v.string(),
  }).index('by_volume', ['volumeId']),
  events: defineTable({
    pathId: v.optional(v.string()),
    time: v.string(),
    status: v.union(v.literal('idle'), v.literal('busy')),
    content: v.optional(v.string()),
  }).index('by_path', ['pathId']),
  devices: defineTable({
    userId: v.optional(v.string()),
    name: v.string(),
    notifications: v.boolean(),
    endpoint: v.optional(v.string()),
    p256dh: v.optional(v.string()),
    auth: v.optional(v.string()),
  }).index('by_user', ['userId']),
})
