import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  createDevice,
  ensureDefaultDevice,
  getBackendMode,
  listDevices,
  type DeviceRecord,
  updateDevice,
} from '~/lib/server/event-repository'

const createDeviceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  includePaths: z.array(z.string().min(1).max(240)).optional(),
  ignorePaths: z.array(z.string().min(1).max(240)).optional(),
})

const updateDeviceSchema = z.object({
  deviceId: z.string().min(1),
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
  includePaths: z.array(z.string().min(1).max(240)).optional(),
  ignorePaths: z.array(z.string().min(1).max(240)).optional(),
})

function toDeviceRecord(device: DeviceRecord) {
  return device
}

function readDeviceKeyHeader(request: Request) {
  return request.headers.get('x-tailwatch-device-key') ?? undefined
}

export const Route = createFileRoute('/api/devices')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const deviceKey = readDeviceKeyHeader(request)
          const userAgent = request.headers.get('user-agent') ?? undefined

          const normalizedDeviceKey = deviceKey?.trim()
          if (normalizedDeviceKey) {
            await ensureDefaultDevice({
              deviceKey: normalizedDeviceKey,
              userAgent,
            })
          }

          const devices = await listDevices(normalizedDeviceKey)
          return Response.json(
            {
              devices: devices.map(toDeviceRecord),
            },
            {
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Devices] GET Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to load devices',
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
          const parsed = createDeviceSchema.safeParse(raw)
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Invalid device payload',
                issues: parsed.error.flatten(),
              },
              { status: 400 },
            )
          }

          const deviceKey = readDeviceKeyHeader(request)
          const userAgent = request.headers.get('user-agent') ?? undefined

          const device = await createDevice({
            deviceKey,
            userAgent,
            ...parsed.data,
          })

          return Response.json(
            {
              device: toDeviceRecord(device),
            },
            {
              status: 201,
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Devices] POST Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to create device',
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
          const parsed = updateDeviceSchema.safeParse(raw)
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Invalid device update payload',
                issues: parsed.error.flatten(),
              },
              { status: 400 },
            )
          }

          const deviceKey = readDeviceKeyHeader(request)
          const device = await updateDevice({
            deviceId: parsed.data.deviceId,
            enabled: parsed.data.enabled,
            name: parsed.data.name,
            includePaths: parsed.data.includePaths,
            ignorePaths: parsed.data.ignorePaths,
            deviceKey,
          })

          return Response.json(
            {
              device: toDeviceRecord(device),
            },
            {
              headers: {
                'x-tailwatch-backend': getBackendMode(),
              },
            },
          )
        } catch (error) {
          console.error('[API/Devices] PATCH Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to update device',
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
