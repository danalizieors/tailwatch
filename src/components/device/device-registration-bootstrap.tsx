import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect, useRef } from 'react'
import {
  getClientDeviceKey,
  getClientDeviceName,
  getUAInfo,
} from '~/lib/device-identity'
import { api } from '../../../convex/_generated/api'

export function DeviceRegistrationBootstrap() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const upsertDevice = useMutation(api.devices.upsertDevice)
  const ensurePersonalVolume = useMutation(api.volumes.ensurePersonalVolume)
  const hasRegisteredRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isLoading) return

    if (!isAuthenticated) {
      hasRegisteredRef.current = false
      return
    }

    if (hasRegisteredRef.current) return
    hasRegisteredRef.current = true

    const { system, browser } = getUAInfo()

    // Fire-and-forget background registration and setup
    void Promise.all([
      upsertDevice({
        deviceKey: getClientDeviceKey(),
        name: getClientDeviceName(),
        system,
        browser,
      }),
      ensurePersonalVolume(),
    ]).catch((error) => {

      hasRegisteredRef.current = false
      console.warn(
        'Failed to bootstrap device registration or personal volume',
        error,
      )
    })
  }, [isAuthenticated, isLoading, upsertDevice, ensurePersonalVolume])

  return null
}
