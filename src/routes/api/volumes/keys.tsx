import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getBackendMode, rotateManagedVolumeKey, updateManagedVolumeKey } from '~/lib/server/event-repository'

const updateKeySchema = z
  .object({
    volumeId: z.string().min(1).optional(),
    keyId: z.string().min(1).optional(),
    enabled: z.boolean().optional(),
    rotate: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.volumeId || value.keyId), {
    path: ['volumeId'],
    message: 'volumeId is required',
  })

export const Route = createFileRoute('/api/volumes/keys')({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        try {
          const raw = await request.json()
          const parsed = updateKeySchema.safeParse(raw)
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Invalid key update payload',
                issues: parsed.error.flatten(),
              },
              { status: 400 },
            )
          }

          const volumeId = parsed.data.volumeId ?? parsed.data.keyId
          if (!volumeId) {
            return Response.json(
              {
                error: 'volumeId is required',
              },
              { status: 400 },
            )
          }

          const key = parsed.data.rotate
            ? await rotateManagedVolumeKey(volumeId)
            : await updateManagedVolumeKey({
                volumeId,
                enabled: parsed.data.enabled,
              })

          return Response.json(
            { key },
            {
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Volumes/Keys] PATCH Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to update key',
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
      POST: async () => {
        return Response.json(
          {
            error: 'Creating additional keys is no longer supported. Use PATCH with rotate=true instead.',
          },
          {
            status: 405,
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          },
        )
      },
      DELETE: async () => {
        return Response.json(
          {
            error: 'Deleting the volume key is not supported. Rotate it instead.',
          },
          {
            status: 405,
            headers: {
              'x-tailwatch-backend': getBackendMode(),
            },
          },
        )
      },
    },
  },
})
