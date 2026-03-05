import { useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { humanId } from 'human-id'
import {
  Info,
  PanelLeft,
  PanelLeftClose,
  Eraser,
  ShieldCheck,
  Shuffle,
  Zap,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AppShellHeader } from '~/components/layout/app-shell-header'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { getClientDeviceName, getUAInfo } from '~/lib/device-identity'
import { NotificationManager } from '~/lib/notifications'
import type { EventStatus } from '~/lib/types'
import { cn } from '~/lib/utils'
import { api } from '../../../convex/_generated/api'
import { ControlBar } from './control-bar'
import { IngestTools } from './ingest-tools'
import { LogStream } from './log-stream'
import { StatusBoard } from './status-board'
import { TestEventDialog } from './test-event-dialog'
import { useDashboardData } from './use-dashboard-data'
import { VolumeSidebar } from './volume-sidebar'

interface DashboardViewProps {
  initialMode?: 'logs' | 'status'
  volume?: string
  isAuthLoading?: boolean
  showAuthLoading?: boolean
}

export function DashboardView({
  initialMode = 'logs',
  volume,
  isAuthLoading,
  showAuthLoading,
}: DashboardViewProps) {
  const [mode, setMode] = useState<'logs' | 'status'>(initialMode)
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(
    undefined,
  )
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [isTestEventDialogOpen, setIsTestEventDialogOpen] = useState(false)
  const [testEventPath, setTestEventPath] = useState('')
  const [testEventStatus, setTestEventStatus] = useState<'idle' | 'busy'>(
    'busy',
  )
  const [testEventContent, setTestEventContent] = useState('')
  const [isSendingTestEvent, setIsSendingTestEvent] = useState(false)
  const [testEventError, setTestEventError] = useState<string | null>(null)
  const [isDeletingByPrefix, setIsDeletingByPrefix] = useState(false)
  const [volumePublishKey, setVolumePublishKey] = useState<string | null>(null)
  const [isHydratingFilter, setIsHydratingFilter] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const { isAuthenticated } = useConvexAuth()
  const navigate = useNavigate()
  const activeVolume = volume?.trim() || 'personal'

  const publish = useMutation(api.events.publish)
  const publishByKey = useMutation(api.events.publishByKey)
  const deleteByTopicPrefix = useMutation((api as any).events.deleteByTopicPrefix)
  const markVolumeSeen = useMutation((api as any).events.markVolumeSeen)
  const setNotifications = useMutation(api.devices.setNotifications)
  const setVolumeNotifications = useMutation(api.volumes.setVolumeNotifications)
  const upsertDevice = useMutation(api.devices.upsertDevice)
  const updateSubscription = useMutation(api.devices.updateSubscription)

  const managedVolumes = useQuery(
    api.volumes.listManagedVolumes,
    isAuthenticated ? {} : 'skip',
  ) as
    | Array<{
        id: any
        name: string
        isDefault?: boolean
        notificationsEnabled: boolean
        key?: { value?: string }
      }>
    | undefined
  const activeVolumeId = useMemo(() => {
    const matchedVolume =
      (managedVolumes ?? []).find((row) => row.name === activeVolume) ??
      (activeVolume === 'personal'
        ? (managedVolumes ?? []).find((row) => row.isDefault)
        : undefined)
    return matchedVolume ? String(matchedVolume.id) : undefined
  }, [managedVolumes, activeVolume])

  const currentDeviceKey = useMemo(() => NotificationManager.getDeviceKey(), [])
  const devicesRaw = useQuery(
    api.devices.listDevices,
    isAuthenticated ? {} : 'skip',
  )

  const devices = useMemo(() => {
    if (!devicesRaw) return undefined
    return devicesRaw.map((d) => ({
      id: d._id,
      deviceKey: d.deviceKey,
      name: d.name,
      isCurrent: d.deviceKey === currentDeviceKey,
      enabled: d.notifications,
      lastSeenAt: d.lastSeenAt,
      os: d.system,
      browser: d.browser,
    }))
  }, [devicesRaw, currentDeviceKey])

  useEffect(() => {
    if (isAuthenticated && currentDeviceKey) {
      const { system, browser } = getUAInfo()
      void upsertDevice({
        deviceKey: currentDeviceKey,
        name: getClientDeviceName(),
        system,
        browser,
      })
    }
  }, [isAuthenticated, currentDeviceKey, upsertDevice])

  const deferredSearch = useDeferredValue(search)

  const { data, error, isLoading, markAllSeen, lastSeenAt, refresh } =
    useDashboardData({
      mode,
      volume,
      topicPrefix: selectedTopic,
      isAuthenticated,
      activeVolumeId,
    })

  const unreadCountsByVolume = useQuery(
    (api as any).events.unreadCountsByVolume,
    isAuthenticated ? {} : 'skip',
  ) as
    | Array<{
        volumeId: string
        volumeName: string
        seenAt: number
        count: number
      }>
    | undefined

  const unreadCountByVolumeId = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of unreadCountsByVolume ?? []) {
      map.set(row.volumeId, Math.max(0, row.count))
    }
    return map
  }, [unreadCountsByVolume])
  const seenAtByVolumeId = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of unreadCountsByVolume ?? []) {
      map.set(row.volumeId, Number.isFinite(row.seenAt) ? row.seenAt : 0)
    }
    return map
  }, [unreadCountsByVolume])
  const activeVolumeSeenAt =
    activeVolumeId ? seenAtByVolumeId.get(activeVolumeId) : undefined
  const effectiveLastSeenAt =
    isAuthenticated && activeVolumeId
      ? (activeVolumeSeenAt ?? lastSeenAt)
      : lastSeenAt

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const persistLastSeen = () => {
      markAllSeen()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistLastSeen()
      }
    }

    window.addEventListener('blur', persistLastSeen)
    window.addEventListener('pagehide', persistLastSeen)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', persistLastSeen)
      window.removeEventListener('pagehide', persistLastSeen)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [markAllSeen])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enableDebug = import.meta.env.VITE_ENABLE_DEBUG_AUTH === 'true'
      const urlParams = new URLSearchParams(window.location.search)
      const debugParam = urlParams.get('debug') === 'true'
      const debugStorage = localStorage.getItem('debug_auth') === 'true'

      if (enableDebug && (debugParam || debugStorage)) {
        setIsDebugMode(true)
        if (debugParam && !debugStorage) {
          localStorage.setItem('debug_auth', 'true')
        }
      }

      setIsHydratingFilter(true)

      const params = new URLSearchParams(window.location.search)
      const filterPath = normalizeTopicPath(
        params.get('filter') ?? params.get('path') ?? undefined,
      )
      setSelectedTopic(filterPath)
      setIsHydratingFilter(false)
    }
  }, [volume])

  useEffect(() => {
    if (typeof window === 'undefined' || isHydratingFilter) return

    const url = new URL(window.location.href)
    if (!selectedTopic) {
      url.searchParams.delete('filter')
      url.searchParams.delete('path')
      window.history.replaceState({}, '', url.toString())
      return
    }

    url.searchParams.set('path', selectedTopic)
    url.searchParams.delete('filter')
    window.history.replaceState({}, '', url.toString())
  }, [selectedTopic, volume, isHydratingFilter])

  useEffect(() => {
    const volumes = managedVolumes ?? []
    const volumeToken = activeVolume.trim()
    const matchedVolume =
      volumes.find((row) => row.key?.value?.trim() === volumeToken) ??
      volumes.find((row) => row.name === volumeToken) ??
      (volumeToken === 'personal'
        ? volumes.find((row) => row.isDefault)
        : undefined)

    const key = matchedVolume?.key?.value?.trim()
    if (key && key.length > 0) {
      setVolumePublishKey(key)
      return
    }

    if (volumeToken && volumeToken !== 'personal') {
      setVolumePublishKey(volumeToken)
      return
    }

    setVolumePublishKey(null)
  }, [activeVolume, managedVolumes])

  const switchVolume = (nextVolumeRaw: string) => {
    const nextVolume = nextVolumeRaw.trim() || 'personal'
    markAllSeen()
    void navigate({
      to: '/dashboard/$volumeId',
      params: { volumeId: nextVolume },
      search: (prev: any) => prev,
    })
  }

  const openTestEventDialog = () => {
    const testEvent = buildRandomTestEvent(selectedTopic)
    setTestEventPath(testEvent.path)
    setTestEventStatus(testEvent.payload.status)
    setTestEventContent(testEvent.payload.content)
    setTestEventError(null)
    setIsTestEventDialogOpen(true)
  }

  const closeTestEventDialog = () => {
    if (isSendingTestEvent) return
    setIsTestEventDialogOpen(false)
    setTestEventError(null)
  }

  const sendTestEvent = async () => {
    if (isSendingTestEvent) return

    const normalizedPath = normalizeTopicPath(testEventPath)
    if (!normalizedPath) {
      setTestEventError('Path is required')
      return
    }

    setIsSendingTestEvent(true)
    setTestEventError(null)

    const payload = {
      time: new Date().toISOString(),
      status: testEventStatus,
      content: testEventContent,
    }

    try {
      if (volumePublishKey) {
        await publishByKey({
          key: volumePublishKey,
          subpath: normalizedPath,
          ...payload,
        })
      } else {
        await publish({
          path: normalizedPath,
          volume: activeVolume,
          ...payload,
        })
      }
      refresh()
      setIsTestEventDialogOpen(false)
    } catch {
      setTestEventError('Failed to send test event')
    }
    setIsSendingTestEvent(false)
  }

  const deleteFilteredPrefix = async () => {
    const normalizedPrefix = normalizeTopicPath(selectedTopic)
    if (isDeletingByPrefix) return

    setIsDeletingByPrefix(true)
    try {
      await deleteByTopicPrefix({
        volume: activeVolume,
        topicPrefix: normalizedPrefix,
      })
      refresh()
    } catch {
      if (typeof window !== 'undefined') {
        window.alert('Failed to clear filtered events and paths')
      }
    } finally {
      setIsDeletingByPrefix(false)
    }
  }

  const filteredEvents = (data?.events ?? []).filter((event) => {
    if (statusFilter !== 'all' && event.status !== statusFilter) return false
    if (!deferredSearch.trim()) return true
    const q = deferredSearch.toLowerCase()
    const haystack =
      `${event.path} ${event.content ?? ''} ${event.entityId ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })

  const filteredEntities = (data?.entities ?? []).filter((entity) => {
    if (statusFilter !== 'all' && entity.currentStatus !== statusFilter)
      return false
    if (!deferredSearch.trim()) return true
    const q = deferredSearch.toLowerCase()
    const haystack =
      `${entity.path} ${entity.lastContent ?? ''} ${entity.entityId ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })

  const showIngestTools =
    mode === 'logs' && Boolean(data) && filteredEvents.length === 0

  return (
    <div className='text-foreground bg-background relative flex h-dvh min-h-dvh w-full flex-col overflow-hidden'>
      {/* Subtle Pixelated Background */}
      <div className='pixel-grid opacity-30' />

      {/* SVG Pixel Filter */}
      <svg className='hidden'>
        <filter id='pixelate'>
          <feFlood x='0' y='0' height='2' width='2' />
          <feComposite width='4' height='4' />
          <feTile result='a' />
          <feComposite in='SourceGraphic' in2='a' operator='in' />
          <feMorphology operator='dilate' radius='2' />
        </filter>
      </svg>

      {/* Header */}
      <div className='z-[100] shrink-0'>
        <AppShellHeader current='events' />
      </div>

      <div className='relative flex min-h-0 flex-1 overflow-hidden'>
        {/* LEFT: Volume Sidebar - Always sharp and accessible */}
        <VolumeSidebar
          activeVolume={activeVolume}
          volumeChoices={(managedVolumes ?? []).map((v) => ({
            id: v.id,
            name: v.name,
            notificationsEnabled: v.notificationsEnabled,
            key: v.key?.value,
            unreadCount: unreadCountByVolumeId.get(String(v.id)) ?? 0,
          }))}
          onVolumeChange={(v) => {
            switchVolume(v)
            setIsSidebarOpen(false)
          }}
          onToggleVolumeNotifications={(volumeId, enabled) => {
            if (!enabled) {
              void markVolumeSeen({
                volumeId: String(volumeId),
                seenAt: Date.now(),
              })
            }
            void setVolumeNotifications({ volumeId, enabled })
          }}
          isAuthenticated={isAuthenticated}
          devices={devices}
          onToggleDeviceMute={async (deviceId, enabled) => {
            const device = devices?.find((d) => d.id === deviceId)
            if (!device) return

            if (enabled && device.isCurrent) {
              const success = await NotificationManager.enableBackgroundPush()
              if (success) {
                const subscription = await NotificationManager.getSubscription()
                if (subscription) {
                  const raw = subscription.toJSON()
                  if (raw.endpoint && raw.keys?.p256dh && raw.keys?.auth) {
                    await updateSubscription({
                      deviceKey: device.deviceKey,
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
            }
            void setNotifications({
              deviceKey: device.deviceKey,
              enabled,
            })
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* CENTER: Main Content */}
        <main className='no-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto'>
          <div className='mx-auto flex w-full max-w-[1400px] flex-col px-4 md:px-8'>
            {/* Sticky Header Section */}
            <div className='bg-background/95 sticky top-0 z-50 space-y-4 pt-4 pb-2 backdrop-blur-sm md:pt-6'>
              {error && (
                <Card className='border-destructive/20 bg-destructive/10 text-destructive-foreground'>
                  <CardContent className='flex items-center gap-3 p-3 text-xs font-medium'>
                    <Info className='h-4 w-4' />
                    Error syncing dashboard: {error}
                  </CardContent>
                </Card>
              )}

              <div className='relative z-20'>
                <ControlBar
                  mode={mode}
                  onModeChange={setMode}
                  topicTree={data?.topicTree ?? []}
                  selectedTopic={selectedTopic}
                  onSelectTopic={(topic) =>
                    setSelectedTopic(normalizeTopicPath(topic))
                  }
                  rightSlot={
                    <div className='flex items-center gap-2'>
                      <Button
                        size='sm'
                        className='shadow-primary-glow bg-primary h-10 gap-2 rounded-lg px-4 text-[10px] font-semibold tracking-wide text-black transition-all hover:opacity-90'
                        onClick={openTestEventDialog}
                      >
                        <Shuffle className='h-3.5 w-3.5' />
                        Test
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='border-primary/60 bg-primary/5 text-primary hover:bg-primary/10 h-10 gap-2 rounded-lg px-3 text-[10px] font-semibold tracking-wide'
                        onClick={() => void deleteFilteredPrefix()}
                        disabled={isDeletingByPrefix}
                        title={
                          selectedTopic
                            ? `Clear all events and paths with prefix ${selectedTopic}`
                            : `Clear all events and paths in volume ${activeVolume}`
                        }
                      >
                        <Eraser className='h-3.5 w-3.5' />
                        Clear
                      </Button>
                    </div>
                  }
                />
              </div>
            </div>

            <div className='flex flex-col gap-4 py-4 pb-12'>
              <div className='grid grid-cols-1 gap-6'>
                <div className='min-h-0'>
                  {isLoading && !data ? (
                    <div className='border-border/40 bg-card/20 flex flex-col items-center justify-center rounded-2xl border py-20 backdrop-blur-sm'>
                      <Zap className='text-primary h-8 w-8 animate-pulse' />
                    </div>
                  ) : data ? (
                    mode === 'logs' ? (
                      filteredEvents.length > 0 ? (
                        <LogStream
                          events={filteredEvents}
                          lastSeenAt={effectiveLastSeenAt}
                        />
                      ) : null
                    ) : (
                      <StatusBoard
                        rows={filteredEntities}
                        lastSeenAt={effectiveLastSeenAt}
                      />
                    )
                  ) : null}
                </div>

                {showIngestTools ? (
                  <div className='mt-4'>
                    <IngestTools
                      volumePublishKey={volumePublishKey}
                      selectedTopic={selectedTopic}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Single Mobile Backdrop Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-[90] transition-[opacity,backdrop-filter,background-color] duration-500 ease-in-out lg:hidden',
          isSidebarOpen
            ? 'bg-background/20 pointer-events-auto visible opacity-100 backdrop-blur-sm'
            : 'bg-background/0 pointer-events-none invisible opacity-0 backdrop-blur-none',
        )}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Floating Action Button (Mobile Sidebar Toggle) */}
      <div className='fixed right-6 bottom-6 z-[110] lg:hidden'>
        <Button
          size='icon'
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className='bg-primary text-primary-foreground shadow-primary-glow flex h-12 w-12 p-0 items-center justify-center rounded-full border-none backdrop-blur-md transition-all active:scale-95 [&>svg]:!h-6 [&>svg]:!w-6'
          title='Toggle Volumes & Devices'
        >
          {isSidebarOpen ? (
            <PanelLeftClose />
          ) : (
            <PanelLeft />
          )}
        </Button>
      </div>

      {isDebugMode && (
        <div className='fixed bottom-4 left-3 z-[100] md:left-4'>
          <div className='bg-warning/20 border-warning/30 text-warning flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide shadow-lg backdrop-blur-md'>
            <ShieldCheck className='h-3 w-3' />
            Debug Mode Active
          </div>
        </div>
      )}

      <TestEventDialog
        open={isTestEventDialogOpen}
        onClose={closeTestEventDialog}
        path={testEventPath}
        onPathChange={setTestEventPath}
        status={testEventStatus}
        onStatusChange={setTestEventStatus}
        content={testEventContent}
        onContentChange={setTestEventContent}
        onSend={() => void sendTestEvent()}
        isSending={isSendingTestEvent}
        error={testEventError}
      />
    </div>
  )
}

function normalizeTopicPath(value?: string | null) {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return undefined
  return trimmed.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

const RANDOM_TITLES = [
  'Pipeline health checkpoint',
  'Notification delivery smoke test',
  'Scheduler execution sample',
  'Cross-service handoff marker',
  'Telemetry payload validation',
] as const

const RANDOM_CONTEXT_LINES = [
  'verifying webhook delivery',
  'checking downstream acknowledgement',
  'inspecting queue depth',
  'sampling edge latency',
  'validating markdown rendering',
] as const

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T
}

function createHumanPathId() {
  return humanId({
    separator: '-',
    capitalize: false,
    adjectiveCount: Math.random() < 0.3 ? 2 : 1,
  })
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildRandomTestEvent(filteredPrefix?: string) {
  const status = Math.random() < 0.55 ? 'busy' : 'idle'
  const randomSegment = createHumanPathId() || `node-${nanoid(4)}`
  const prefix = normalizeTopicPath(filteredPrefix)
  const path = prefix ? `${prefix}/${randomSegment}` : randomSegment
  const title = pickRandom(RANDOM_TITLES)
  const context = pickRandom(RANDOM_CONTEXT_LINES)

  const content = [
    `### ${title}`,
    status === 'busy'
      ? `- **BUSY** \`${randomSegment}\` ${context}`
      : `- **IDLE** \`${randomSegment}\` ${context}`,
    status === 'busy' ? '> _processing_ synthetic run' : '> _idle_ awaiting next task',
  ].join('\n')

  return {
    path,
    payload: {
      time: new Date().toISOString(),
      status,
      content,
    },
  }
}
