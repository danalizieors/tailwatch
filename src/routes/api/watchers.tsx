import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  createWatcher,
  ensureDefaultWatcher,
  getBackendMode,
  listWatchers,
  updateWatcher,
} from '~/lib/server/event-repository'

const createWatcherSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  includePaths: z.array(z.string().min(1).max(240)).optional(),
  ignorePaths: z.array(z.string().min(1).max(240)).optional(),
})

const updateWatcherSchema = z.object({
  watcherId: z.string().min(1),
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
  includePaths: z.array(z.string().min(1).max(240)).optional(),
  ignorePaths: z.array(z.string().min(1).max(240)).optional(),
})

export const Route = createFileRoute('/api/watchers')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const watcherKey = request.headers.get('x-tailwatch-watcher-key') ?? undefined
          const userAgent = request.headers.get('user-agent') ?? undefined

          const normalizedWatcherKey = watcherKey?.trim()
          if (normalizedWatcherKey) {
            await ensureDefaultWatcher({
              workspace,
              watcherKey: normalizedWatcherKey,
              userAgent,
            })
          }

          const watchers = await listWatchers(workspace, undefined)
          return Response.json(
            {
              watchers,
            },
            {
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Watchers] GET Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to load watchers',
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
      POST: async ({ request }) => {
        try {
          const raw = await request.json()
          const parsed = createWatcherSchema.safeParse(raw)
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Invalid watcher payload',
                issues: parsed.error.flatten(),
              },
              { status: 400 },
            )
          }

          const workspace = request.headers.get('x-tailwatch-workspace') ?? undefined
          const watcherKey = request.headers.get('x-tailwatch-watcher-key') ?? undefined
          const userAgent = request.headers.get('user-agent') ?? undefined

          const watcher = await createWatcher({
            workspace,
            watcherKey,
            userAgent,
            ...parsed.data,
          })

          return Response.json(
            {
              watcher,
            },
            {
              status: 201,
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Watchers] POST Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to create watcher',
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
      PATCH: async ({ request }) => {
        try {
          const raw = await request.json()
          const parsed = updateWatcherSchema.safeParse(raw)
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Invalid watcher update payload',
                issues: parsed.error.flatten(),
              },
              { status: 400 },
            )
          }

          const watcherKey = request.headers.get('x-tailwatch-watcher-key') ?? undefined
          const watcher = await updateWatcher({
            ...parsed.data,
            watcherKey,
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
          console.error('[API/Watchers] PATCH Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to update watcher',
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
