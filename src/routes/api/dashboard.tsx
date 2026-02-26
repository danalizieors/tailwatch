import { createFileRoute } from '@tanstack/react-router'
import { getBackendMode, getDashboardSnapshot } from '~/lib/server/event-repository'

export const Route = createFileRoute('/api/dashboard')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const topicPrefix = url.searchParams.get('topicPrefix') ?? undefined
          const status = url.searchParams.get('status') ?? undefined
          const type = url.searchParams.get('type') ?? undefined
          const q = url.searchParams.get('q') ?? undefined
          const limit = url.searchParams.get('limit')
          const snapshot = await getDashboardSnapshot({
            workspace,
            topicPrefix,
            status,
            type,
            q,
            limit: limit ? Number(limit) : undefined,
          })
          return Response.json(snapshot, {
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
          console.error('[API/Dashboard] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to build dashboard snapshot',
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
