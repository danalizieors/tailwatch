import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BellOff, ChevronLeft, Laptop2, Loader2, RefreshCw } from 'lucide-react'
import { z } from 'zod'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { fetchPushDevices, removePushDevice, type PushDeviceRecord } from '~/lib/client-api'
import { NotificationManager } from '~/lib/notifications'
import { cn } from '~/lib/utils'

const searchSchema = z.object({
  workspace: z.string().optional(),
})

export const Route = createFileRoute('/settings/devices')({
  validateSearch: (search) => searchSchema.parse(search),
  component: NotificationDevicesPage,
})

function NotificationDevicesPage() {
  const { workspace } = Route.useSearch()
  const workspaceKey = workspace?.trim() || 'default'

  const [devices, setDevices] = useState<PushDeviceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [removingEndpoint, setRemovingEndpoint] = useState<string | null>(null)
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null)

  const loadDevices = useCallback(
    async (silent = false) => {
      try {
        setError(null)
        if (silent) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }

        const next = await fetchPushDevices(workspaceKey)
        setDevices(next)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load linked devices')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [workspaceKey],
  )

  useEffect(() => {
    void loadDevices(false)
  }, [loadDevices])

  useEffect(() => {
    let cancelled = false

    const detectCurrentEndpoint = async () => {
      if (typeof window === 'undefined') return
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (!cancelled) {
          setCurrentEndpoint(subscription?.endpoint ?? null)
        }
      } catch {
        if (!cancelled) {
          setCurrentEndpoint(null)
        }
      }
    }

    void detectCurrentEndpoint()
    return () => {
      cancelled = true
    }
  }, [])

  const headerLinks = useMemo(() => {
    const links = [
      { href: `/${encodeURIComponent(workspaceKey)}`, label: 'Back to logs' },
      { href: workspaceKey === 'default' ? '/status' : `/${encodeURIComponent(workspaceKey)}/status`, label: 'Back to status' },
    ]
    return links
  }, [workspaceKey])

  const handleDisableDevice = async (endpoint: string) => {
    try {
      setNotice(null)
      setError(null)
      setRemovingEndpoint(endpoint)

      const isCurrentDevice = currentEndpoint === endpoint
      if (isCurrentDevice) {
        const disabled = await NotificationManager.disableBackgroundPush()
        if (!disabled) {
          await removePushDevice(endpoint)
        }
        setCurrentEndpoint(null)
      } else {
        await removePushDevice(endpoint)
      }

      setNotice(isCurrentDevice ? 'Notifications disabled for this device.' : 'Device notifications disabled.')
      await loadDevices(true)
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Failed to disable device notifications')
    } finally {
      setRemovingEndpoint(null)
    }
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col gap-4 px-3 py-4 md:px-8 md:py-8">
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black uppercase tracking-wider">Linked Devices</CardTitle>
              <CardDescription>
                Manage where push notifications are enabled for workspace <span className="font-semibold text-foreground">{workspaceKey}</span>.
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
        <CardContent className="space-y-3">
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

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading linked devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-4 text-sm text-muted-foreground">
              No linked devices found for this workspace yet.
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => {
                const isCurrentDevice = currentEndpoint === device.endpoint
                const label = formatDeviceLabel(device.userAgent)
                const updated = formatRelativeTime(device.updatedAt)

                return (
                  <div
                    key={device.endpoint}
                    className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/50 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Laptop2 className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        {isCurrentDevice ? <Badge variant="success">This device</Badge> : null}
                        <Badge variant="outline">{device.workspace ?? 'default'}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{shortEndpoint(device.endpoint)}</p>
                      <p className="text-xs text-muted-foreground">{updated}</p>
                    </div>
                    <div className="shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => void handleDisableDevice(device.endpoint)}
                        disabled={removingEndpoint === device.endpoint}
                      >
                        {removingEndpoint === device.endpoint ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <BellOff className="h-3.5 w-3.5" />
                        )}
                        {isCurrentDevice ? 'Disable here' : 'Disable device'}
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
  )
}

function formatDeviceLabel(userAgent?: string) {
  if (!userAgent || !userAgent.trim()) return 'Unknown device'
  const browser = parseBrowser(userAgent)
  const os = parseOs(userAgent)
  return `${browser} on ${os}`
}

function parseBrowser(userAgent: string) {
  if (userAgent.includes('Edg/')) return 'Edge'
  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) return 'Opera'
  if (userAgent.includes('Firefox/')) return 'Firefox'
  if (userAgent.includes('Chrome/')) return 'Chrome'
  if (userAgent.includes('Safari/')) return 'Safari'
  return 'Browser'
}

function parseOs(userAgent: string) {
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac OS X')) return 'macOS'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
  if (userAgent.includes('Linux')) return 'Linux'
  return 'Unknown OS'
}

function shortEndpoint(endpoint: string) {
  if (endpoint.length <= 84) return endpoint
  return `${endpoint.slice(0, 52)}...${endpoint.slice(-24)}`
}

function formatRelativeTime(value?: string) {
  if (!value) return 'Last seen: unknown'
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return `Last seen: ${value}`

  const diffMs = Date.now() - timestamp
  if (diffMs < 60_000) return 'Last seen just now'
  if (diffMs < 3_600_000) return `Last seen ${Math.floor(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `Last seen ${Math.floor(diffMs / 3_600_000)}h ago`
  return `Last seen ${Math.floor(diffMs / 86_400_000)}d ago`
}
