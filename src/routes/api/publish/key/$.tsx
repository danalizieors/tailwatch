import { createFileRoute } from '@tanstack/react-router'
import { appendEventByBindingKey, getBackendMode } from '~/lib/server/event-repository'
import { notifyPushSubscribersForEvent } from '~/lib/server/push-notifier'

export const Route = createFileRoute('/api/publish/key/$')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const splat = params._splat ?? ''
          const [key, ...subpathParts] = splat.split('/').filter(Boolean)
          if (!key) {
            return Response.json(
              { error: 'Binding key is required' },
              {
                status: 400,
                headers: { 'x-tailwatch-backend': getBackendMode() },
              },
            )
          }

          const subpath = subpathParts.join('/')
          const payload = await request.json()
          const event = await appendEventByBindingKey(key, subpath, typeof payload === 'object' ? payload : {})

          try {
            await notifyPushSubscribersForEvent(event)
          } catch (pushError) {
            console.warn('[API/PublishKey] Push notify failed:', pushError)
          }

          return Response.json(event, {
            status: 201,
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
          console.error('[API/PublishKey] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to publish event by key',
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
