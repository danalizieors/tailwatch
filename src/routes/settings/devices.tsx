import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { Bell, BellOff, Laptop, Loader2, LogIn, Save, Send, Trash2 } from 'lucide-react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { AppShellHeader } from '~/components/layout/app-shell-header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getClientDeviceKey, setClientDeviceName } from '~/lib/device-identity'

export const Route = createFileRoute('/settings/devices')({
  component: DeviceSettingsPage,
})

function DeviceSettingsPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const { signIn } = useAuthActions()

  const [currentDeviceKey, setCurrentDeviceKey] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [busyAction, setBusyAction] = useState<'save' | 'toggle' | 'delete' | 'test' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const updateDevice = useMutation(api.devices.updateDevice)
  const deleteDevice = useMutation(api.devices.deleteDevice)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setCurrentDeviceKey(getClientDeviceKey())
  }, [])

  const devices = useQuery(
    api.devices.listDevices,
    isAuthenticated && currentDeviceKey
      ? {
          currentDeviceKey,
        }
      : 'skip',
  )

  useEffect(() => {
    if (!devices || devices.length === 0) {
      setSelectedDeviceId('')
      setNameDraft('')
      return
    }

    const selected = selectedDeviceId
      ? devices.find((device) => String(device.id) === selectedDeviceId)
      : undefined

    const next = selected ?? devices[0]
    setSelectedDeviceId(String(next.id))
    setNameDraft(next.name)
  }, [devices, selectedDeviceId])

  const selectedDevice = useMemo(() => {
    if (!devices || devices.length === 0) return null
    return devices.find((device) => String(device.id) === selectedDeviceId) ?? null
  }, [devices, selectedDeviceId])

  const handleSaveDevice = async () => {
    if (!selectedDevice) return

    const nextName = nameDraft.trim()
    if (!nextName) {
      setError('Device name is required.')
      return
    }

    try {
      setBusyAction('save')
      setError(null)
      setNotice(null)

      await updateDevice({
        deviceId: selectedDevice.id,
        name: nextName,
      })

      if (selectedDevice.isCurrent) {
        setClientDeviceName(nextName)
      }

      setNotice('Device updated.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update device')
    } finally {
      setBusyAction(null)
    }
  }

  const handleToggleNotifications = async () => {
    if (!selectedDevice) return

    try {
      setBusyAction('toggle')
      setError(null)
      setNotice(null)

      await updateDevice({
        deviceId: selectedDevice.id,
        enabled: !selectedDevice.enabled,
      })

      setNotice(selectedDevice.enabled ? 'Notifications disabled for this device.' : 'Notifications enabled for this device.')
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update notification state')
    } finally {
      setBusyAction(null)
    }
  }

  const handleDeleteDevice = async () => {
    if (!selectedDevice || selectedDevice.isCurrent) return

    if (!window.confirm(`Delete device "${selectedDevice.name}"?`)) {
      return
    }

    try {
      setBusyAction('delete')
      setError(null)
      setNotice(null)

      await deleteDevice({
        deviceId: selectedDevice.id,
      })

      setNotice(`Deleted device "${selectedDevice.name}".`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete device')
    } finally {
      setBusyAction(null)
    }
  }

  const handleTestNotification = async () => {
    try {
      setBusyAction('test')
      setError(null)
      setNotice(null)

      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error('Notifications are only available in the browser')
      }

      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications')
      }

      let permission = window.Notification.permission
      if (permission === 'default') {
        permission = await window.Notification.requestPermission()
      }

      if (permission !== 'granted') {
        throw new Error('Notification permission not granted')
      }

      const title = 'Tailwatch Test Notification'
      const body = selectedDevice
        ? `Test notification for ${selectedDevice.name}`
        : 'Test notification from device manager'

      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.showNotification(title, {
          body,
          tag: 'tailwatch-test-notification',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: {
            url: '/settings/devices',
          },
        })
      } else {
        new window.Notification(title, {
          body,
          tag: 'tailwatch-test-notification',
        })
      }

      setNotice('Test notification sent.')
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Failed to send test notification')
    } finally {
      setBusyAction(null)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[100svh] w-full flex-col md:min-h-dvh">
        <AppShellHeader current="devices" />
        <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-10 md:px-8">
          <Card className="w-full border-border/70 bg-card/85 backdrop-blur">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading authentication state...
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[100svh] w-full flex-col md:min-h-dvh">
        <AppShellHeader current="devices" />
        <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-10 md:px-8">
          <Card className="w-full border-border/70 bg-card/85 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base font-black uppercase tracking-wider">Device Manager</CardTitle>
              <CardDescription>Sign in to view and manage your registered devices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="button" className="gap-1.5" onClick={() => void signIn('github', { redirectTo: '/settings/devices' })}>
                <LogIn className="h-3.5 w-3.5" />
                Sign in with GitHub
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100svh] w-full flex-col md:min-h-dvh">
      <AppShellHeader current="devices" />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 md:px-8 md:py-10">
        <Card className="border-border/70 bg-card/85 backdrop-blur">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-wider">
            <Laptop className="h-4 w-4 text-primary" />
            Device Manager
          </CardTitle>
          <CardDescription>
            Devices are identified by a per-browser device key and registered automatically after login.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-md border border-success/35 bg-success/10 px-3 py-2 text-xs font-medium text-success">
              {notice}
            </div>
          ) : null}

          <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
            <Label htmlFor="device-select">Select device</Label>
            {devices === undefined ? (
              <div className="flex h-9 items-center text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Loading devices...
              </div>
            ) : devices.length === 0 ? (
              <div className="text-xs text-muted-foreground">No devices registered yet.</div>
            ) : (
              <select
                id="device-select"
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={busyAction !== null}
              >
                {devices.map((device) => (
                  <option key={String(device.id)} value={String(device.id)}>
                    {device.name}
                    {device.isCurrent ? ' (this device)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedDevice ? (
            <div className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{selectedDevice.name}</p>
                {selectedDevice.isCurrent ? <Badge variant="success">Current Device</Badge> : null}
                <Badge variant={selectedDevice.enabled ? 'success' : 'outline'}>
                  {selectedDevice.enabled ? 'Notifications Enabled' : 'Notifications Disabled'}
                </Badge>
              </div>

              <div className="space-y-1">
                <Label>Device key</Label>
                <div className="rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-xs break-all">
                  {selectedDevice.deviceKey}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="device-name">Device name</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="device-name"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    disabled={busyAction !== null}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSaveDevice()}
                    disabled={busyAction !== null}
                    className="gap-1.5"
                  >
                    {busyAction === 'save' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleToggleNotifications()}
                  disabled={busyAction !== null}
                  className="gap-1.5"
                >
                  {busyAction === 'toggle' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : selectedDevice.enabled ? (
                    <BellOff className="h-3.5 w-3.5" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}
                  {selectedDevice.enabled ? 'Disable notifications' : 'Enable notifications'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleTestNotification()}
                  disabled={busyAction !== null}
                  className="gap-1.5"
                >
                  {busyAction === 'test' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Test notification
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleDeleteDevice()}
                  disabled={busyAction !== null || selectedDevice.isCurrent}
                  className="gap-1.5"
                  title={selectedDevice.isCurrent ? 'Current device cannot be deleted' : 'Delete this device'}
                >
                  {busyAction === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete device
                </Button>
              </div>
            </div>
          ) : null}

        </CardContent>
      </Card>
      </main>
    </div>
  )
}
