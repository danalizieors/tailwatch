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
    .index('by_user', ['userId'])
    .index('by_user_and_name', ['userId', 'name'])
    .index('by_key', ['key']),
  paths: defineTable({
    volumeId: v.string(),
    path: v.string(),
  })
    .index('by_volumeId', ['volumeId'])
    .index('by_volumeId_and_path', ['volumeId', 'path']),
  events: defineTable({
    pathId: v.string(),
    time: v.string(),
    status: v.union(v.literal('idle'), v.literal('busy')),
    content: v.optional(v.string()),
  }).index('by_pathId', ['pathId']),
  devices: defineTable({
    userId: v.string(),
    name: v.string(),
    deviceKey: v.string(),
    lastSeenAt: v.optional(v.string()),
    notifications: v.boolean(),
    subscription: v.optional(
      v.union(
        v.object({
          endpoint: v.string(),
          expirationTime: v.optional(v.number()),
          keys: v.object({
            p256dh: v.string(),
            auth: v.string(),
          }),
        }),
        v.null(),
      ),
    ),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_deviceKey', ['userId', 'deviceKey']),
})
