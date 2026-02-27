import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getBackendMode, upsertPushSubscription } from '~/lib/server/event-repository'

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

const bodySchema = z.object({
  subscription: pushSubscriptionSchema,
  vapidPublicKey: z.string().min(1).optional(),
})

export const Route = createFileRoute('/api/push/subscribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json()
          const parsed = bodySchema.safeParse(raw)
          if (!parsed.success) {
            return Response.json(
              { error: 'Invalid push subscription payload', issues: parsed.error.flatten() },
              { status: 400 },
            )
          }

          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const userAgent = request.headers.get('user-agent') ?? undefined
          const subscription = parsed.data.subscription

          const result = await upsertPushSubscription({
            endpoint: subscription.endpoint,
            expirationTime:
              typeof subscription.expirationTime === 'number' ? subscription.expirationTime : undefined,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            workspace,
            userAgent,
            clientVapidPublicKey: parsed.data.vapidPublicKey,
          })

          return Response.json(result, {
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
          console.error('[API/Push/Subscribe] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to save push subscription',
            },
            {
              status: 500,
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        }
      },
    },
  },
})
