import { createFileRoute } from '@tanstack/react-router'
import { appendEvent, getBackendMode } from '~/lib/server/event-repository'
import { notifyPushSubscribersForEvent } from '~/lib/server/push-notifier'

export const Route = createFileRoute('/api/publish/$')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const topicPath = params._splat ?? ''
          const payload = await request.json()
          const event = await appendEvent(topicPath, {
            ...(typeof payload === 'object' ? payload : {}),
            workspace,
          })

          try {
            await notifyPushSubscribersForEvent(event)
          } catch (pushError) {
            console.warn('[API/Publish] Push notify failed:', pushError)
          }

          return Response.json(event, {
            status: 201,
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
          console.error('[API/Publish] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to publish event',
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
