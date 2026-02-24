import { createFileRoute } from '@tanstack/react-router'
import { appendEvent, getBackendMode } from '~/lib/server/event-repository'

export const Route = createFileRoute('/api/publish/$')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const topicPath = params._splat ?? ''
          const payload = await request.json()
          const event = await appendEvent(topicPath, payload)
          return Response.json(event, {
            status: 201,
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
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
