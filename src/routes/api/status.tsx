import { createFileRoute } from '@tanstack/react-router'
import { getBackendMode, getStatusSnapshot } from '~/lib/server/event-repository'

export const Route = createFileRoute('/api/status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const topicPrefix = url.searchParams.get('topicPrefix') ?? undefined
          const snapshot = await getStatusSnapshot(topicPrefix, workspace)
          return Response.json(snapshot, {
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
          console.error('[API/Status] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to build status snapshot',
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
