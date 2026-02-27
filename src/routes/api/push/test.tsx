import { createFileRoute } from '@tanstack/react-router'
import { getBackendMode, sendPushNotificationsForEvent } from '~/lib/server/event-repository'

export const Route = createFileRoute('/api/push/test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined

          const result = await sendPushNotificationsForEvent({
            workspace,
            path: 'system/push/test',
            status: 'idle',
            content: 'Manual push test from dashboard',
          })

          return Response.json(result, {
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
          console.error('[API/Push/Test] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to send push test',
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
