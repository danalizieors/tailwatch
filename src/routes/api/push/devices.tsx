import { createFileRoute } from '@tanstack/react-router'
import { getBackendMode, listPushSubscriptions } from '~/lib/server/event-repository'

export const Route = createFileRoute('/api/push/devices')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const devices = await listPushSubscriptions(workspace)

          return Response.json(
            {
              devices,
            },
            {
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Push/Devices] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to load linked devices',
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
