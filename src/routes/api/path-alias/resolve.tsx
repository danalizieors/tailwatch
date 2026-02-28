import { createFileRoute } from '@tanstack/react-router'
import { getBackendMode, resolvePathAlias } from '~/lib/server/event-repository'

export const Route = createFileRoute('/api/path-alias/resolve')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const aliasId = url.searchParams.get('id')?.trim()
          if (!aliasId) {
            return Response.json({ error: 'id query param is required' }, { status: 400 })
          }

          const volume = request.headers.get('x-tailwatch-volume') ?? undefined
          const resolved = await resolvePathAlias(volume, aliasId)

          if (!resolved) {
            return Response.json(
              {
                found: false,
              },
              {
                headers: {
                  'x-tailwatch-backend': getBackendMode(),
                },
              },
            )
          }

          return Response.json(
            {
              found: true,
              ...resolved,
            },
            {
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/PathAlias/Resolve] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to resolve path alias',
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
