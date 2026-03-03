'use node'

import { buildPushHTTPRequest } from '@pushforge/builder'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action, internalAction } from './_generated/server'
import { env } from './env'

export const sendPushNotification = action({
  args: {
    deviceId: v.id('devices'),
    payload: v.object({
      title: v.string(),
      body: v.string(),
      tag: v.string(),
      url: v.string(),
    }),
    options: v.object({
      ttl: v.number(),
      topic: v.string(),
      urgency: v.union(
        v.literal('very-low'),
        v.literal('low'),
        v.literal('normal'),
        v.literal('high'),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const device = await ctx.runQuery(internal.devices.getDeviceInternal, {
      deviceId: args.deviceId,
    })

    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK: JSON.parse(env.VAPID_PRIVATE_KEY),
      message: {
        adminContact: env.VAPID_SUBJECT,
        payload: args.payload,
        options: args.options,
      },
      subscription: device?.subscription,
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    })

    if (!response.ok) {
      ctx.runMutation(internal.devices.clearPushSubscriptionInternal, {
        deviceId: args.deviceId,
      })
      console.log(`[push] subscription expired for device: ${args.deviceId}`)
      return { ok: false, reason: 'subscription_expired' }
    }

    return { ok: true }
  },
})
