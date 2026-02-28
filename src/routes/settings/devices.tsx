import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Bell, BellOff, ChevronLeft, Loader2, Plus, RefreshCw, Save, Smartphone } from 'lucide-react'
import { z } from 'zod'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { createWatcher, fetchWatchers, updateWatcher, type WatcherRecord } from '~/lib/client-api'
import { getClientWatcherKey, NotificationManager } from '~/lib/notifications'
import { cn } from '~/lib/utils'

const searchSchema = z.object({
  workspace: z.string().optional(),
})

type DeviceDraft = {
  name: string
}

export const Route = createFileRoute('/settings/devices')({
  validateSearch: (search) => searchSchema.parse(search),
  component: NotificationDevicesPage,
})

function NotificationDevicesPage() {
  const { workspace } = Route.useSearch()
  const workspaceKey = workspace?.trim() || 'personal'
  const currentWatcherKey = getClientWatcherKey()

  const [devices, setDevices] = useState<WatcherRecord[]>([])
  const [drafts, setDrafts] = useState<Record<string, DeviceDraft>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [newDeviceName, setNewDeviceName] = useState('')

  const loadDevices = useCallback(
    async (silent = false) => {
      try {
        setError(null)
        if (silent) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }

        const next = await fetchWatchers(workspaceKey, currentWatcherKey)
        setDevices(next)
        setDrafts((prev) => {
          const nextDrafts: Record<string, DeviceDraft> = { ...prev }
          for (const device of next) {
            if (!nextDrafts[device.id]) {
              nextDrafts[device.id] = {
                name: device.name,
              }
            }
          }
          return nextDrafts
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load devices')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [workspaceKey, currentWatcherKey],
  )

  useEffect(() => {
    void loadDevices(false)
  }, [loadDevices])

  const headerLinks = useMemo(() => {
    const links = [
      { href: `/${encodeURIComponent(workspaceKey)}`, label: 'Back to logs' },
      { href: workspaceKey === 'personal' ? '/status' : `/${encodeURIComponent(workspaceKey)}/status`, label: 'Back to status' },
      { href: workspaceKey === 'personal' ? '/settings/volumes' : `/settings/volumes?workspace=${encodeURIComponent(workspaceKey)}`, label: 'Volume settings' },
    ]
    return links
  }, [workspaceKey])

  const onDraftChange = (deviceId: string, patch: Partial<DeviceDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [deviceId]: {
        name: patch.name ?? prev[deviceId]?.name ?? '',
      },
    }))
  }

  const handleToggleDevice = async (device: WatcherRecord) => {
    try {
      setNotice(null)
      setError(null)
      setBusyDeviceId(device.id)

      const isCurrent = device.watcherKey === currentWatcherKey
      if (isCurrent) {
        if (device.enabled) {
          await NotificationManager.disableBackgroundPush(workspaceKey)
        } else {
          const enabled = await NotificationManager.enableBackgroundPush(workspaceKey)
          if (!enabled) {
            throw new Error(NotificationManager.getLastPushError() ?? 'Failed to enable push for this device')
          }
        }
      } else {
        await updateWatcher({
          watcherId: device.id,
          enabled: !device.enabled,
        })
      }

      setNotice(isCurrent ? 'Notification state updated for this device.' : 'Device notification state updated.')
      await loadDevices(true)
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to toggle device notifications')
    } finally {
      setBusyDeviceId(null)
    }
  }

  const handleSaveDevice = async (device: WatcherRecord) => {
    const draft = drafts[device.id]
    if (!draft) return

    try {
      setNotice(null)
      setError(null)
      setBusyDeviceId(device.id)

      await updateWatcher({
        watcherId: device.id,
        watcherKey: device.watcherKey,
        name: draft.name.trim() || device.name,
      })

      setNotice('Device details saved.')
      await loadDevices(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save device')
    } finally {
      setBusyDeviceId(null)
    }
  }

  const handleCreateDevice = async () => {
    try {
      setNotice(null)
      setError(null)
      setIsCreating(true)

      await createWatcher({
        workspace: workspaceKey,
        name: newDeviceName.trim() || undefined,
      })

      setNewDeviceName('')
      setNotice('Device profile created.')
      await loadDevices(true)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create device')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col gap-4 px-3 py-4 md:px-8 md:py-8">
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black uppercase tracking-wider">Devices</CardTitle>
              <CardDescription>
                Manage global notification devices. Volumes only group paths; notification toggle is per device.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => void loadDevices(true)}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {headerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {link.label}
              </a>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice ? (
            <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          ) : null}

          <div className="rounded-lg border border-border/50 bg-background/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add device profile</p>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={newDeviceName}
                onChange={(event) => setNewDeviceName(event.target.value)}
                className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                placeholder="Device name"
              />
              <Button className="gap-1.5" onClick={() => void handleCreateDevice()} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-4 text-sm text-muted-foreground">
              No devices found yet.
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => {
                const draft = drafts[device.id] ?? {
                  name: device.name,
                }
                const isCurrent = device.watcherKey === currentWatcherKey
                const isBusy = busyDeviceId === device.id

                return (
                  <div
                    key={device.id}
                    className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">{device.name}</p>
                        {isCurrent ? <Badge variant="success">This browser</Badge> : null}
                        <Badge variant={device.enabled ? 'success' : 'outline'}>{device.enabled ? 'Notifications On' : 'Notifications Off'}</Badge>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => void handleToggleDevice(device)}
                        disabled={isBusy}
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : device.enabled ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                        {device.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        value={draft.name}
                        onChange={(event) => onDraftChange(device.id, { name: event.target.value })}
                        className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                        placeholder="Device name"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => void handleSaveDevice(device)}
                        disabled={isBusy}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {device.endpoint ? shortEndpoint(device.endpoint) : 'No push subscription yet'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function shortEndpoint(endpoint: string) {
  if (endpoint.length <= 84) return endpoint
  return `${endpoint.slice(0, 52)}...${endpoint.slice(-24)}`
}
