import { createFileRoute } from '@tanstack/react-router'
import { getBackendMode, getOrCreateCurrentDevice, type DeviceRecord } from '~/lib/server/event-repository'

function toDeviceRecord(device: DeviceRecord) {
  return device
}

export const Route = createFileRoute('/api/devices/current')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const deviceKey = request.headers.get('x-tailwatch-device-key') ?? undefined
          const deviceName = request.headers.get('x-tailwatch-device-name') ?? undefined
          const userAgent = request.headers.get('user-agent') ?? undefined

          const device = await getOrCreateCurrentDevice({
            deviceKey,
            name: deviceName,
            userAgent,
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
          console.error('[API/Devices/Current] Error:', error)
          return Response.json(
            {
              error: error instanceof Error ? error.message : 'Failed to load current device',
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
