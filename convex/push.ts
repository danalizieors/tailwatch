'use node'

import { getAuthUserId } from '@convex-dev/auth/server'
import { buildPushHTTPRequest } from '@pushforge/builder'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action, internalAction } from './_generated/server'
import { env } from './env'

const internalApi = internal as any

async function requireUserId(ctx: any) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('Sign in required')
  return userId
}

export const sendTestPush = action({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const device = await ctx.runQuery(internalApi.devices.getDeviceInternal, {
      deviceId: args.deviceId,
    })
    if (!device || device.userId !== userId) throw new Error('Unauthorized')

    if (!device.subscription || !device.notifications) {
      throw new Error('Notifications are not enabled for this device')
    }

    return await ctx.runAction(internalApi.push.sendPushForEventInternal, {
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
    const { VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env

    let privateJWK
    try {
      privateJWK = JSON.parse(VAPID_PRIVATE_KEY)
    } catch (e) {
      console.error('Failed to parse VAPID_PRIVATE_KEY as JSON (JWK)')
      return { ok: false, reason: 'invalid_vapid_key' }
    }

    const targets = await ctx.runQuery(
      internalApi.devices.listPushTargetsInternal,
      {
        userId: args.userId,
        deviceId: args.deviceId,
      },
    )

    if (targets.length === 0) {
      console.log('No push targets found for', {
        userId: args.userId,
        deviceId: args.deviceId,
      })
      return { ok: true, sent: 0 }
    }

    const title = `Tailwatch ${args.status === 'busy' ? 'Busy' : 'Idle'}`
    const body = args.content?.trim()
      ? `${args.path}: ${args.content}`
      : `${args.path} is ${args.status}`
    const tag = `tailwatch:${args.volume}:${args.path}`
    const url = `/${args.volume}?path=${encodeURIComponent(args.path)}`

    // Ensure adminContact is mailto: or https:
    let finalAdminContact = VAPID_SUBJECT
    if (
      !finalAdminContact.startsWith('mailto:') &&
      !finalAdminContact.startsWith('https:')
    ) {
      if (finalAdminContact.includes('@')) {
        finalAdminContact = `mailto:${finalAdminContact}`
      } else {
        finalAdminContact = `https://${finalAdminContact}`
      }
    }

    let sent = 0
    for (const target of targets) {
      try {
        const {
          endpoint,
          headers,
          body: requestBody,
        } = await buildPushHTTPRequest({
          privateJWK,
          subscription: {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          message: {
            payload: { title, body, tag, url },
            adminContact: finalAdminContact,
            options: {
              ttl: 300,
              urgency: args.status === 'busy' ? 'high' : 'normal',
            },
          },
        })

        const serviceName = endpoint.split('/')[2] ?? endpoint
        console.log(`Sending push to ${serviceName}`)
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: requestBody,
        })
        if (res.status === 404 || res.status === 410) {
          console.log(
            `Push subscription expired for device ${target.deviceId} (${serviceName})`,
          )
          await ctx.runMutation(
            internalApi.devices.clearPushSubscriptionInternal,
            { deviceId: target.deviceId },
          )
        } else if (res.ok) {
          sent++
        } else {
          const errorText = await res.text().catch(() => 'no error body')
          console.error(
            `Push service (${serviceName}) responded with status ${res.status}: ${errorText}`,
          )
        }
      } catch (e) {
        console.error('Push delivery failed with error:', e)
      }
    }
    return { ok: true, sent }
  },
})
