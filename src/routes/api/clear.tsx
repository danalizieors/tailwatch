import { createFileRoute } from '@tanstack/react-router'
import { clearAll, getBackendMode } from '~/lib/server/event-repository'

export const Route = createFileRoute('/api/clear')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Check for API Key / Bearer Token
          const authHeader = request.headers.get('Authorization')
          const adminSecret = process.env.TAILWATCH_ADMIN_SECRET
          
          if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const result = await clearAll()
          return Response.json(result, {
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
          console.error('[API/Clear] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to clear database',
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
