import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ensurePathAlias, getBackendMode } from '~/lib/server/event-repository'

const bodySchema = z.object({
  path: z.string().min(1),
})

export const Route = createFileRoute('/api/path-alias/ensure')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json()
          const parsed = bodySchema.safeParse(raw)
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Invalid alias ensure payload',
                issues: parsed.error.flatten(),
              },
              { status: 400 },
            )
          }

          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const alias = await ensurePathAlias(workspace, parsed.data.path)

          return Response.json(alias, {
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          })
        } catch (error) {
          console.error('[API/PathAlias/Ensure] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to create/resolve path alias',
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
