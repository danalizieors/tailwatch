import { useEffect, useRef } from 'react'
import { useConvexAuth, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { getClientDeviceKey, getClientDeviceName, inferBrowserName, inferPlatformName } from '~/lib/device-identity'

export function DeviceRegistrationBootstrap() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const registerDevice = useMutation(api.devices.registerDevice)
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

    // Fire-and-forget background registration and setup
    void Promise.all([
      registerDevice({
        deviceKey: getClientDeviceKey(),
        name: getClientDeviceName(),
        os: inferPlatformName(),
        browser: inferBrowserName(navigator.userAgent),
      }),
      ensurePersonalVolume(),
    ]).catch((error) => {
      hasRegisteredRef.current = false
      console.warn('Failed to bootstrap device registration or personal volume', error)
    })
  }, [isAuthenticated, isLoading, registerDevice, ensurePersonalVolume])

  return null
}
