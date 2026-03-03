import { useAuthActions } from '@convex-dev/auth/react'
import { createFileRoute } from '@tanstack/react-router'
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react'
import {
  Bell,
  BellOff,
  Command,
  Compass,
  Globe,
  Laptop,
  Layout,
  Loader2,
  LogIn,
  Monitor,
  Save,
  Send,
  Terminal,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AppShellHeader } from '~/components/layout/app-shell-header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getClientDeviceKey, setClientDeviceName } from '~/lib/device-identity'
import { formatRelative } from '~/lib/format'
import { NotificationManager } from '~/lib/notifications'
import { cn, getPathColor } from '~/lib/utils'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/settings/devices')({
  component: DeviceSettingsPage,
})

function getOSIcon(os?: string) {
  const name = os?.toLowerCase() || ''
  if (name.includes('win')) return Layout
  if (
    name.includes('mac') ||
    name.includes('ios') ||
    name.includes('iphone') ||
    name.includes('ipad')
  )
    return Command
  if (name.includes('linux') || name.includes('android')) return Terminal
  return Monitor
}

function getBrowserIcon(browser?: string) {
  const name = browser?.toLowerCase() || ''
  if (name.includes('safari')) return Compass
  return Globe
}

function DeviceSettingsPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const { signIn } = useAuthActions()

  const [currentDeviceKey, setCurrentDeviceKey] = useState('')
  const [nameDraftsById, setNameDraftsById] = useState<Record<string, string>>(
    {},
  )
  const [busyAction, setBusyAction] = useState<{
    type: string
    id: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const updateDevice = useMutation(api.devices.updateDevice)
  const deleteDevice = useMutation(api.devices.deleteDevice)
  const sendPushNotification = useAction(api.push.sendPushNotification)
  const updatePushSubscription = useMutation(api.devices.updatePushSubscription)

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

  const sortedDevices = useMemo(() => {
    return [...(devices ?? [])].sort((a, b) => {
      if (a.isCurrent) return -1
      if (b.isCurrent) return 1
      return (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '')
    })
  }, [devices])

  const handleSaveDevice = async (device: any) => {
    const deviceId = String(device.id)
    const draft = nameDraftsById[deviceId] ?? device.name
    const nextName = draft.trim()
    if (!nextName) {
      setError('Device name is required.')
      return
    }

    try {
      setBusyAction({ type: 'save', id: deviceId })
      setError(null)
      setNotice(null)

      await updateDevice({
        deviceId: device.id,
        name: nextName,
      })

      if (device.isCurrent) {
        setClientDeviceName(nextName)
      }

      setNotice(`Device "${nextName}" updated.`)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to update device',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleToggleNotifications = async (device: any) => {
    const deviceId = String(device.id)
    try {
      setBusyAction({ type: 'toggle', id: deviceId })
      setError(null)
      setNotice(null)

      const nextEnabled = !device.enabled

      if (device.isCurrent && nextEnabled) {
        // Step 1: Request Browser Permission & Setup Subscription
        const success = await NotificationManager.enableBackgroundPush()
        if (!success) {
          throw new Error(
            NotificationManager.getLastPushError() ||
              'Browser notification setup failed',
          )
        }

        // Step 2: Extract & Sync Subscription with Convex
        const subscription = await NotificationManager.getSubscription()
        if (subscription) {
          const raw = subscription.toJSON()
          if (raw.endpoint && raw.keys?.p256dh && raw.keys?.auth) {
            await updatePushSubscription({
              deviceKey: currentDeviceKey,
              subscription: {
                endpoint: raw.endpoint,
                expirationTime: raw.expirationTime ?? undefined,
                keys: {
                  p256dh: raw.keys.p256dh,
                  auth: raw.keys.auth,
                },
              },
            })
          }
        }
      }

      // Step 3: Always update the device's basic enabled flag
      await updateDevice({
        deviceId: device.id,
        enabled: nextEnabled,
      })

      setNotice(
        nextEnabled
          ? `Notifications enabled for "${device.name}".`
          : `Notifications disabled for "${device.name}".`,
      )
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : 'Failed to update notification state',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleDeleteDevice = async (device: any) => {
    if (device.isCurrent) return

    if (!window.confirm(`Delete device "${device.name}"?`)) {
      return
    }

    try {
      setBusyAction({ type: 'delete', id: String(device.id) })
      setError(null)
      setNotice(null)

      await deleteDevice({
        deviceId: device.id,
      })

      setNotice(`Deleted device "${device.name}".`)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Failed to delete device',
      )
    } finally {
      setBusyAction(null)
    }
  }

  const handleTestNotification = async (device: any) => {
    const deviceId = String(device.id)
    try {
      setBusyAction({ type: 'test', id: deviceId })
      setError(null)
      setNotice(null)

      if (!device.enabled || !device.hasSubscription) {
        throw new Error(
          'Notifications must be enabled on the target device first',
        )
      }

      await sendPushNotification({
        deviceId: device.id,
        payload: {
          title: 'Tailwatch Test',
          body: `Test notification for ${device.name}`,
          tag: 'aa:test',
          url: '/',
        },
        options: {
          ttl: 300,
          topic: 'bb:test',
          urgency: 'high',
        },
      })

      setNotice(`Test notification sent to "${device.name}".`)
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : 'Failed to send test notification',
      )
    } finally {
      setBusyAction(null)
    }
  }

  if (authLoading) {
    return (
      <div className='flex min-h-dvh w-full flex-col md:min-h-dvh'>
        <AppShellHeader current='devices' />
        <main className='mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-10 md:px-8'>
          <Card className='border-border/70 bg-card/85 w-full backdrop-blur'>
            <CardContent className='text-muted-foreground flex items-center gap-2 p-4 text-sm'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading authentication state...
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className='flex min-h-dvh w-full flex-col md:min-h-dvh'>
        <AppShellHeader current='devices' />
        <main className='mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-10 md:px-8'>
          <Card className='border-border/70 bg-card/85 w-full backdrop-blur'>
            <CardHeader>
              <CardTitle className='text-base font-black tracking-wider uppercase'>
                Device Manager
              </CardTitle>
              <CardDescription>
                Sign in to view and manage your registered devices.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              <Button
                type='button'
                className='gap-1.5'
                onClick={() =>
                  void signIn('github', {
                    redirectTo: '/settings/devices',
                  })
                }
              >
                <LogIn className='h-3.5 w-3.5' />
                Sign in with GitHub
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className='bg-background flex min-h-dvh w-full flex-col md:min-h-dvh'>
      <AppShellHeader current='devices' />
      <main className='mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-10'>
        <div className='space-y-1'>
          <h1 className='text-foreground flex items-center gap-2 text-2xl font-black tracking-tight uppercase'>
            <Laptop className='text-primary h-6 w-6' />
            Device Management
          </h1>
          <p className='text-muted-foreground text-sm'>
            Monitor and configure push notification targets for your account.
          </p>
        </div>

        {error ? (
          <div className='border-destructive/20 bg-destructive/10 text-destructive animate-in fade-in slide-in-from-top-1 rounded-xl border px-4 py-3 text-xs font-black tracking-widest uppercase'>
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className='border-info/20 bg-info/10 text-info animate-in fade-in slide-in-from-top-1 rounded-xl border px-4 py-3 text-xs font-black tracking-widest uppercase'>
            {notice}
          </div>
        ) : null}

        {/* Device List */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {devices === undefined ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card
                key={i}
                className='border-border/40 bg-card/30 h-64 animate-pulse'
              />
            ))
          ) : devices.length === 0 ? (
            <div className='border-border/60 bg-muted/10 text-muted-foreground col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed py-20'>
              <Monitor className='mb-2 h-8 w-8 opacity-20' />
              <p className='text-xs font-black tracking-widest text-zinc-500 uppercase'>
                No devices registered
              </p>
            </div>
          ) : (
            sortedDevices.map((device: any) => {
              const deviceId = String(device.id)
              const nameDraft = nameDraftsById[deviceId] ?? device.name
              const isBusy = busyAction?.id === deviceId
              const color = getPathColor(device.name + deviceId)
              const OSIcon = getOSIcon(device.os)
              const BrowserIcon = getBrowserIcon(device.browser)

              return (
                <Card
                  key={deviceId}
                  className={cn(
                    'group border-border/40 bg-card/30 hover:bg-card/50 flex flex-col overflow-hidden transition-all',
                    isBusy && 'opacity-60',
                  )}
                >
                  <CardHeader className='p-4 pb-3'>
                    <div className='flex items-start justify-between'>
                      <div className='flex items-center gap-3'>
                        <div
                          className='h-8 w-1 shrink-0 rounded-full'
                          style={{
                            backgroundColor: color,
                          }}
                        />
                        <div className='flex min-w-0 flex-col'>
                          <CardTitle className='text-foreground truncate text-xs font-black tracking-widest uppercase'>
                            {device.name}
                          </CardTitle>
                          <div className='mt-0.5 flex items-center gap-1.5'>
                            <div className='flex shrink-0 items-center gap-1'>
                              <OSIcon
                                className='h-3 w-3 text-zinc-500'
                                title={device.os}
                              />
                              <BrowserIcon
                                className='h-3 w-3 text-zinc-500'
                                title={device.browser}
                              />
                            </div>
                            {device.isCurrent ? (
                              <Badge
                                variant='info'
                                className='text-xxs h-4 px-1 font-black tracking-widest uppercase'
                              >
                                You
                              </Badge>
                            ) : (
                              <span className='text-xxs font-bold whitespace-nowrap text-zinc-500'>
                                seen{' '}
                                {device.lastSeenAt
                                  ? formatRelative(device.lastSeenAt)
                                  : 'never'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        size='icon'
                        variant='ghost'
                        className={cn(
                          'h-8 w-8 shrink-0 rounded-xl transition-all duration-200',
                          device.enabled
                            ? 'text-primary bg-primary/5 border-primary/20 border shadow-sm'
                            : 'hover:bg-muted/50 text-zinc-600 hover:text-zinc-400',
                        )}
                        onClick={() => void handleToggleNotifications(device)}
                        disabled={busyAction !== null}
                        title={device.enabled ? 'Mute device' : 'Unmute device'}
                      >
                        {busyAction?.type === 'toggle' && isBusy ? (
                          <Loader2 className='h-3.5 w-3.5 animate-spin' />
                        ) : device.enabled ? (
                          <Bell className='h-3.5 w-3.5' />
                        ) : (
                          <BellOff className='h-3.5 w-3.5' />
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className='flex flex-1 flex-col justify-between space-y-4 p-4 pt-0'>
                    <div className='space-y-3'>
                      <div className='space-y-1.5'>
                        <Label className='ml-1 text-xs leading-none font-black tracking-widest text-zinc-400 uppercase'>
                          Device Name
                        </Label>
                        <div className='flex gap-2'>
                          <Input
                            value={nameDraft}
                            onChange={(event) =>
                              setNameDraftsById((previous) => ({
                                ...previous,
                                [deviceId]: event.target.value,
                              }))
                            }
                            className='bg-background/50 h-8 text-xs font-black tracking-widest uppercase'
                            disabled={busyAction !== null}
                          />
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => void handleSaveDevice(device)}
                            disabled={
                              busyAction !== null || nameDraft === device.name
                            }
                            className='bg-background/50 h-8 px-2'
                          >
                            {busyAction?.type === 'save' && isBusy ? (
                              <Loader2 className='h-3.5 w-3.5 animate-spin' />
                            ) : (
                              <Save className='h-3.5 w-3.5' />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='ml-1 text-xs leading-none font-black tracking-widest text-zinc-400 uppercase'>
                          Device Key
                        </Label>
                        <div className='border-border/40 bg-background/50 text-xxs rounded-lg border px-3 py-2 font-mono leading-tight break-all text-zinc-400'>
                          {device.deviceKey}
                        </div>
                      </div>
                    </div>

                    <div className='border-border/20 flex items-center gap-2 border-t pt-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='hover:bg-primary/5 hover:text-primary h-8 flex-1 gap-2 rounded-lg px-2 text-xs font-black tracking-widest uppercase transition-all active:scale-95'
                        onClick={() => void handleTestNotification(device)}
                        disabled={
                          busyAction !== null ||
                          !device.enabled ||
                          !device.hasSubscription
                        }
                      >
                        {busyAction?.type === 'test' && isBusy ? (
                          <Loader2 className='h-3.5 w-3.5 animate-spin' />
                        ) : (
                          <Send className='h-3 w-3' />
                        )}
                        Test Push
                      </Button>

                      {!device.isCurrent && (
                        <Button
                          size='sm'
                          variant='ghost'
                          className='hover:bg-destructive/5 hover:text-destructive h-8 w-8 rounded-lg px-0 text-zinc-500 transition-all active:scale-95'
                          onClick={() => void handleDeleteDevice(device)}
                          disabled={busyAction !== null}
                        >
                          {busyAction?.type === 'delete' && isBusy ? (
                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                          ) : (
                            <Trash2 className='h-3.5 w-3.5' />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
