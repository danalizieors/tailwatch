import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { Bell, BellOff, Laptop, Loader2, LogIn, Save, Send, Trash2 } from 'lucide-react'
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react'
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
  const [nameDraftsById, setNameDraftsById] = useState<Record<string, string>>({})
  const [busyAction, setBusyAction] = useState<'save' | 'toggle' | 'delete' | 'test' | null>(null)
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const updateDevice = useMutation(api.devices.updateDevice)
  const deleteDevice = useMutation(api.devices.deleteDevice)
  const sendTestPush = useAction(api.push.sendTestPush)

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
    if (!devices) return

    setNameDraftsById((previous) => {
      const next: Record<string, string> = {}
      for (const device of devices) {
        const deviceId = String(device.id)
        next[deviceId] = previous[deviceId] ?? device.name
      }
      return next
    })
  }, [devices])

  const handleSaveDevice = async (device: NonNullable<typeof devices>[number]) => {
    const deviceId = String(device.id)
    const draft = nameDraftsById[deviceId] ?? device.name
    const nextName = draft.trim()
    if (!nextName) {
      setError('Device name is required.')
      return
    }

    try {
      setBusyAction('save')
      setBusyDeviceId(deviceId)
      setError(null)
      setNotice(null)

      await updateDevice({
        deviceId: device.id,
        name: nextName,
      })

      if (device.isCurrent) {
        setClientDeviceName(nextName)
      }

      setNameDraftsById((previous) => ({
        ...previous,
        [deviceId]: nextName,
      }))

      setNotice(`Device "${nextName}" updated.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update device')
    } finally {
      setBusyAction(null)
      setBusyDeviceId(null)
    }
  }

  const handleToggleNotifications = async (device: NonNullable<typeof devices>[number]) => {
    const deviceId = String(device.id)
    try {
      setBusyAction('toggle')
      setBusyDeviceId(deviceId)
      setError(null)
      setNotice(null)

      await updateDevice({
        deviceId: device.id,
        enabled: !device.enabled,
      })

      setNotice(device.enabled ? `Notifications disabled for "${device.name}".` : `Notifications enabled for "${device.name}".`)
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update notification state')
    } finally {
      setBusyAction(null)
      setBusyDeviceId(null)
    }
  }

  const handleDeleteDevice = async (device: NonNullable<typeof devices>[number]) => {
    if (device.isCurrent) return

    if (!window.confirm(`Delete device "${device.name}"?`)) {
      return
    }

    try {
      setBusyAction('delete')
      setBusyDeviceId(String(device.id))
      setError(null)
      setNotice(null)

      await deleteDevice({
        deviceId: device.id,
      })

      setNotice(`Deleted device "${device.name}".`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete device')
    } finally {
      setBusyAction(null)
      setBusyDeviceId(null)
    }
  }

  const handleTestNotification = async (device: NonNullable<typeof devices>[number]) => {
    try {
      setBusyAction('test')
      setBusyDeviceId(String(device.id))
      setError(null)
      setNotice(null)

      if (!device.enabled || !device.hasSubscription) {
        throw new Error('Notifications must be enabled on the target device first')
      }

      await sendTestPush({ deviceId: device.id })

      setNotice(`Test notification sent to "${device.name}".`)
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Failed to send test notification')
    } finally {
      setBusyAction(null)
      setBusyDeviceId(null)
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

          {devices === undefined ? (
            <div className="flex h-9 items-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Loading devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-background/50 p-3 text-xs text-muted-foreground">
              No devices registered yet.
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const deviceId = String(device.id)
                const nameDraft = nameDraftsById[deviceId] ?? device.name
                const isBusyDevice = busyDeviceId === deviceId

                return (
                  <div key={deviceId} className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{device.name}</p>
                      {device.isCurrent ? <Badge variant="success">Current Device</Badge> : null}
                      <Badge variant={device.enabled ? 'success' : 'outline'}>
                        {device.enabled ? 'Notifications Enabled' : 'Notifications Disabled'}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <Label>Device key</Label>
                      <div className="rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-xs break-all">
                        {device.deviceKey}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`device-name-${deviceId}`}>Device name</Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id={`device-name-${deviceId}`}
                          value={nameDraft}
                          onChange={(event) =>
                            setNameDraftsById((previous) => ({
                              ...previous,
                              [deviceId]: event.target.value,
                            }))
                          }
                          disabled={busyAction !== null}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleSaveDevice(device)}
                          disabled={busyAction !== null}
                          className="gap-1.5"
                        >
                          {busyAction === 'save' && isBusyDevice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleToggleNotifications(device)}
                        disabled={busyAction !== null}
                        className="gap-1.5"
                      >
                        {busyAction === 'toggle' && isBusyDevice ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : device.enabled ? (
                          <BellOff className="h-3.5 w-3.5" />
                        ) : (
                          <Bell className="h-3.5 w-3.5" />
                        )}
                        {device.enabled ? 'Disable notifications' : 'Enable notifications'}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleTestNotification(device)}
                        disabled={busyAction !== null}
                        className="gap-1.5"
                      >
                        {busyAction === 'test' && isBusyDevice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Test notification
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => void handleDeleteDevice(device)}
                        disabled={busyAction !== null || device.isCurrent}
                        className="gap-1.5"
                        title={device.isCurrent ? 'Current device cannot be deleted' : 'Delete this device'}
                      >
                        {busyAction === 'delete' && isBusyDevice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Delete device
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </CardContent>
      </Card>
      </main>
    </div>
  )
}
