import { createFileRoute } from '@tanstack/react-router'
import { appendEvent, getBackendMode } from '~/lib/server/event-repository'

export const Route = createFileRoute('/api/publish/$')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          // Check for API Key / Bearer Token
          const authHeader = request.headers.get('Authorization')
          const adminSecret = process.env.TAILWATCH_ADMIN_SECRET
          
          if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const topicPath = params._splat ?? ''
          const payload = await request.json()
          const event = await appendEvent(topicPath, {
            ...(typeof payload === 'object' ? payload : {}),
            workspace,
          })
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
