"use node"

import { v } from 'convex/values'
import { buildPushHTTPRequest } from '@pushforge/builder'
import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { auth } from './auth'

async function requireUserId(ctx: any) {
  const userId = await auth.getUserId(ctx)
  if (!userId) throw new Error('Sign in required')
  return userId
}

export const sendTestPush = action({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const device = await ctx.runQuery(internal.devices.getDeviceInternal, { deviceId: args.deviceId })
    if (!device || device.userId !== userId) throw new Error('Unauthorized')

    if (!device.subscription || !device.notifications) {
      throw new Error('Notifications are not enabled for this device')
    }

    return await ctx.runAction(internal.push.sendPushForEventInternal, {
      volume: 'test',
      path: 'internal/test',
      status: 'idle',
      content: `Test notification for ${device.name}`,
      userId,
      deviceId: args.deviceId,
    })
  },
})

export const sendPushForEventInternal = internalAction({
  args: {
    volume: v.string(),
    path: v.string(),
    status: v.union(v.literal('busy'), v.literal('idle')),
    content: v.optional(v.string()),
    userId: v.optional(v.string()),
    deviceId: v.optional(v.id('devices')),
  },
  handler: async (ctx, args) => {
    const rawVapidKey = process.env.VAPID_PRIVATE_KEY
    const adminContact = process.env.VAPID_SUBJECT

    if (!rawVapidKey || !adminContact) {
      console.error('Missing VAPID_PRIVATE_KEY or VAPID_SUBJECT environment variables')
      return { ok: false, reason: 'missing_env_vars' }
    }

    let privateJWK
    try {
      privateJWK = JSON.parse(rawVapidKey)
    } catch (e) {
      console.error('Failed to parse VAPID_PRIVATE_KEY as JSON (JWK)')
      return { ok: false, reason: 'invalid_vapid_key' }
    }

    const targets = await ctx.runQuery(internal.devices.listPushTargetsInternal, { 
      userId: args.userId,
      deviceId: args.deviceId,
    })

    if (targets.length === 0) {
      console.log('No push targets found for', { userId: args.userId, deviceId: args.deviceId })
      return { ok: true, sent: 0 }
    }

    const title = `Tailwatch ${args.status === 'busy' ? 'Busy' : 'Idle'}`
    const body = args.content?.trim() ? `${args.path}: ${args.content}` : `${args.path} is ${args.status}`
    const tag = `tailwatch:${args.volume}:${args.path}`
    const url = `/${args.volume}?path=${encodeURIComponent(args.path)}`

    let sent = 0
    for (const target of targets) {
      try {
        const { endpoint, headers, body: requestBody } = await buildPushHTTPRequest({
          privateJWK,
          subscription: {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          message: {
            payload: { title, body, tag, url },
            adminContact,
            options: { ttl: 300, urgency: args.status === 'busy' ? 'high' : 'normal', topic: tag },
          },
        })

        const res = await fetch(endpoint, { method: 'POST', headers, body: requestBody })
        if (res.status === 404 || res.status === 410) {
          console.log(`Push subscription expired for device ${target.deviceId}, clearing.`)
          await ctx.runMutation(internal.devices.clearPushSubscriptionInternal, { deviceId: target.deviceId })
        } else if (res.ok) {
          sent++
        } else {
          const errorText = await res.text()
          console.error(`Push service responded with status ${res.status}: ${errorText}`)
        }
      } catch (e) {
        console.error('Push delivery failed with error:', e)
      }
    }
    return { ok: true, sent }
  }
})
