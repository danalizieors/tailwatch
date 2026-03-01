import { useEffect, useRef } from 'react'
import { useConvexAuth, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { getClientDeviceKey, getClientDeviceName } from '~/lib/device-identity'

export function DeviceRegistrationBootstrap() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const ensureDefaultDevice = useMutation(api.devices.ensureDefaultDevice)
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

    void ensureDefaultDevice({
      deviceKey: getClientDeviceKey(),
      name: getClientDeviceName(),
    }).catch((error) => {
      hasRegisteredRef.current = false
      console.warn('Failed to register current device after login', error)
    })
  }, [isAuthenticated, isLoading, ensureDefaultDevice])

  return null
}
