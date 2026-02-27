import { createFileRoute } from '@tanstack/react-router'
import { getBackendMode, getOrCreateCurrentWatcher } from '~/lib/server/event-repository'

export const Route = createFileRoute('/api/watchers/current')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const watcherKey = request.headers.get('x-tailwatch-watcher-key') ?? undefined
          const watcherName = request.headers.get('x-tailwatch-watcher-name') ?? undefined
          const userAgent = request.headers.get('user-agent') ?? undefined

          const watcher = await getOrCreateCurrentWatcher({
            workspace,
            watcherKey,
            name: watcherName,
            userAgent,
          })

          return Response.json(
            {
              watcher,
            },
            {
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Watchers/Current] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to load current watcher',
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
