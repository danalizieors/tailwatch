import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  createManagedVolume,
  getBackendMode,
  listManagedVolumes,
  renameManagedVolume,
} from '~/lib/server/event-repository'

const createVolumeSchema = z.object({
  name: z.string().min(1).max(120),
})

const renameVolumeSchema = z.object({
  volumeId: z.string().min(1),
  name: z.string().min(1).max(120),
})

export const Route = createFileRoute('/api/volumes')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const volumes = await listManagedVolumes()
          return Response.json(
            { volumes },
            {
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Volumes] GET Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to load volumes',
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
          const parsed = createVolumeSchema.safeParse(raw)
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Invalid volume payload',
                issues: parsed.error.flatten(),
              },
              { status: 400 },
            )
          }

          const volume = await createManagedVolume(parsed.data.name)
          return Response.json(
            { volume },
            {
              status: 201,
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Volumes] POST Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to create volume',
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
          const parsed = renameVolumeSchema.safeParse(raw)
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Invalid volume update payload',
                issues: parsed.error.flatten(),
              },
              { status: 400 },
            )
          }

          const volume = await renameManagedVolume(parsed.data)
          return Response.json(
            { volume },
            {
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Volumes] PATCH Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to update volume',
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
