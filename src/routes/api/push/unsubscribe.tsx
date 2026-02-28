import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getBackendMode, removePushSubscription } from '~/lib/server/event-repository'

const bodySchema = z.object({
  endpoint: z.string().url().optional(),
  deviceKey: z.string().min(1).optional(),
})

export const Route = createFileRoute('/api/push/unsubscribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json()
          const parsed = bodySchema.safeParse(raw)
          if (!parsed.success) {
            return Response.json(
              { error: 'Invalid unsubscribe payload', issues: parsed.error.flatten() },
              { status: 400 },
            )
          }

          if (!parsed.data.endpoint && !parsed.data.deviceKey) {
            return Response.json(
              { error: 'endpoint or deviceKey is required' },
              { status: 400 },
            )
          }

          const result = await removePushSubscription({
            endpoint: parsed.data.endpoint,
            deviceKey: parsed.data.deviceKey,
          })

          return Response.json(result, {
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
          console.error('[API/Push/Unsubscribe] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to remove push subscription',
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
