import { useDeferredValue, useState, useEffect, useMemo } from 'react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useNavigate } from '@tanstack/react-router'
import {
  Info,
  ShieldCheck,
  Volume2,
  VolumeX,
  Zap,
  LayoutGrid,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import type { EventStatus } from '~/lib/types'
import { api } from '../../../convex/_generated/api'
import { LogStream } from './log-stream'
import { StatusBoard } from './status-board'
import { useDashboardData } from './use-dashboard-data'
import { AppShellHeader } from '~/components/layout/app-shell-header'
import { cn } from '~/lib/utils'
import { NotificationManager } from '~/lib/notifications'
import { IngestTools } from './ingest-tools'
import { ControlBar } from './control-bar'
import { ActionBar } from './action-bar'
import { VolumeSidebar } from './volume-sidebar'
import { inferBrowserName, inferPlatformName } from '~/lib/device-identity'

interface DashboardViewProps {
  initialMode?: 'logs' | 'status'
  volume?: string
  isAuthLoading?: boolean
  showAuthLoading?: boolean
}

export function DashboardView({ initialMode = 'logs', volume, isAuthLoading, showAuthLoading }: DashboardViewProps) {
  const [mode, setMode] = useState<'logs' | 'status'>(initialMode)
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [isSoundEnabled, setIsSoundEnabled] = useState(NotificationManager.isEnabled())
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [isGeneratingRandomEvents, setIsGeneratingRandomEvents] = useState(false)
  const [generatorMessage, setGeneratorMessage] = useState<string | null>(null)
  const [volumePublishKey, setVolumePublishKey] = useState<string | null>(null)
  const [volumeOptions, setVolumeOptions] = useState<string[]>(['personal'])
  const [isHydratingFilter, setIsHydratingFilter] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const { isAuthenticated } = useConvexAuth()
  const navigate = useNavigate()
  
  const publish = useMutation(api.events.publish)
  const publishByKey = useMutation(api.events.publishByKey)
  const updateDevice = useMutation(api.devices.updateDevice)
  const setVolumeNotifications = useMutation(api.volumes.setVolumeNotifications)
  const registerDevice = useMutation(api.devices.registerDevice)

  const managedVolumes = useQuery(api.volumes.listManagedVolumes, isAuthenticated ? {} : 'skip') as
    | Array<{ id: any; name: string; isDefault?: boolean; notificationsEnabled: boolean; key?: { value?: string } }>
    | undefined

  const currentDeviceKey = useMemo(() => NotificationManager.getDeviceKey(), [])
  const devices = useQuery(api.devices.listDevices, isAuthenticated ? { currentDeviceKey } : 'skip')

  useEffect(() => {
    if (isAuthenticated && currentDeviceKey) {
      void registerDevice({ 
        deviceKey: currentDeviceKey,
        os: inferPlatformName(),
        browser: inferBrowserName(navigator.userAgent),
      })
    }
  }, [isAuthenticated, currentDeviceKey, registerDevice])

  const deferredSearch = useDeferredValue(search)

  const { data, error, isLoading, markAllSeen, lastSeenAt, refresh } = useDashboardData({
    mode,
    volume,
    topicPrefix: selectedTopic,
  })

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
      const filterPath = normalizeTopicPath(params.get('filter') ?? params.get('path') ?? undefined)
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

  const activeVolume = volume?.trim() || 'personal'
  const volumeChoices = useMemo(() => {
    const values = Array.from(new Set(['personal', ...volumeOptions, activeVolume].map((value) => value.trim()).filter(Boolean)))
    return values.sort((left, right) => {
      if (left === 'personal') return -1
      if (right === 'personal') return 1
      return left.localeCompare(right)
    })
  }, [volumeOptions, activeVolume])

  useEffect(() => {
    const volumes = managedVolumes ?? []
    const knownVolumes = Array.from(
      new Set(
        volumes
          .map((row) => row.name?.trim())
          .filter((name): name is string => Boolean(name && name.length > 0)),
      ),
    )

    setVolumeOptions(knownVolumes.length > 0 ? knownVolumes : ['personal'])

    const volumeToken = activeVolume.trim()
    const matchedVolume =
      volumes.find((row) => row.key?.value?.trim() === volumeToken) ??
      volumes.find((row) => row.name === volumeToken) ??
      (volumeToken === 'personal' ? volumes.find((row) => row.isDefault) : undefined)

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

  const toggleSound = () => {
    if (isSoundEnabled) {
      NotificationManager.disableSound()
      setIsSoundEnabled(false)
    } else {
      NotificationManager.enableSound()
      setIsSoundEnabled(true)
    }
  }

  const switchVolume = (nextVolumeRaw: string) => {
    const nextVolume = nextVolumeRaw.trim() || 'personal'
    void navigate({ 
      to: '/$volumeId', 
      params: { volumeId: nextVolume },
      search: (prev: any) => prev 
    })
  }

  const generateRandomEvents = async () => {
    if (isGeneratingRandomEvents) return

    setIsGeneratingRandomEvents(true)
    setGeneratorMessage(null)

    const testEvent = buildRandomTestEvent()
    try {
      if (volumePublishKey) {
        await publishByKey({
          key: volumePublishKey,
          subpath: testEvent.path,
          ...testEvent.payload,
        })
      } else {
        await publish({
          path: testEvent.path,
          volume: activeVolume,
          ...testEvent.payload,
        })
      }
      refresh()
      setGeneratorMessage(`Test event sent: ${testEvent.path}`)
    } catch {
      setGeneratorMessage('Failed to send test event')
    }

    setIsGeneratingRandomEvents(false)
  }

  const filteredEvents = (data?.events ?? []).filter((event) => {
    if (statusFilter !== 'all' && event.status !== statusFilter) return false
    if (!deferredSearch.trim()) return true
    const q = deferredSearch.toLowerCase()
    const haystack = `${event.path} ${event.content ?? ''} ${event.entityId ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })

  const headerTopRight = (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="ghost"
        className={cn('h-8 w-8', isSoundEnabled ? 'text-primary' : 'text-zinc-500')}
        onClick={toggleSound}
        title={isSoundEnabled ? 'Mute beep' : 'Enable beep'}
      >
        {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </Button>
    </div>
  )

  return (
    <div className="flex h-dvh min-h-dvh w-full flex-col overflow-hidden text-foreground bg-background">
      {/* Header */}
      <div className="z-50 shrink-0">
        <AppShellHeader
          current="events"
          topRight={headerTopRight}
        />
      </div>

      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* LEFT: Volume Sidebar - Always sharp and accessible */}
        <VolumeSidebar
          activeVolume={activeVolume}
          volumeChoices={(managedVolumes ?? []).map(v => ({ 
            id: v.id, 
            name: v.name, 
            notificationsEnabled: v.notificationsEnabled,
            key: v.key?.value
          }))}
          onVolumeChange={(v) => {
            switchVolume(v)
            setIsSidebarOpen(false)
          }}
          onToggleVolumeNotifications={(volumeId, enabled) => void setVolumeNotifications({ volumeId, enabled })}
          isAuthenticated={isAuthenticated}
          devices={devices}
          onToggleDeviceMute={(deviceId, enabled) => void updateDevice({ deviceId, enabled })}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* CENTER: Main Content */}
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto no-scrollbar">
          <div className="max-w-[1400px] w-full mx-auto px-4 md:px-8 flex flex-col">
            {/* Sticky Header Section */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm pt-4 md:pt-6 pb-2 space-y-4">
              <div className="relative z-20">
                <ControlBar
                  mode={mode}
                  onModeChange={setMode}
                  topicTree={data?.topicTree ?? []}
                  selectedTopic={selectedTopic}
                  onSelectTopic={(topic) => setSelectedTopic(normalizeTopicPath(topic))}
                />
              </div>

              {error && (
                <Card className="border-destructive/20 bg-destructive/10 text-destructive-foreground">
                  <CardContent className="p-3 text-xs font-medium flex items-center gap-3">
                    <Info className="h-4 w-4" />
                    Error syncing dashboard: {error}
                  </CardContent>
                </Card>
              )}

              <div className="relative z-10">
                <ActionBar
                  search={search}
                  onSearchChange={setSearch}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  onAcknowledgeAll={markAllSeen}
                  itemCount={mode === 'logs' ? filteredEvents.length : (data?.entities.length ?? 0)}
                  mode={mode}
                  stats={data?.stats}
                />
              </div>

              {/* Log Header - Sticky when in logs mode */}
              {mode === 'logs' && (
                <div className="hidden md:grid grid-cols-[100px_80px_minmax(0,1fr)_100px] gap-4 px-6 py-2 bg-primary/5 rounded-xl text-xs uppercase font-black tracking-widest text-zinc-500 border border-white/5 shadow-sm">
                  <div>Timestamp</div>
                  <div>Status</div>
                  <div>Message</div>
                  <div className="text-right">Path</div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 py-4 pb-12">
              <div className="grid grid-cols-1 gap-6">
                <div className="min-h-0">
                  {isLoading && !data ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-border/40 bg-card/20 backdrop-blur-sm">
                      <Zap className="h-8 w-8 text-primary mb-4 animate-pulse" />
                      <div className="text-zinc-400 text-xs font-black uppercase tracking-widest">
                        Synchronizing Stream...
                      </div>
                    </div>
                  ) : data ? (
                    mode === 'logs' ? (
                      <LogStream events={filteredEvents} lastSeenAt={lastSeenAt} />
                    ) : (
                      <StatusBoard rows={data.entities} lastSeenAt={lastSeenAt} />
                    )
                  ) : null}
                </div>

                {/* Ingest Tools */}
                <div className="mt-4">
                  <IngestTools
                    volumePublishKey={volumePublishKey}
                    selectedTopic={selectedTopic}
                    onSendTest={generateRandomEvents}
                    isGeneratingRandomEvents={isGeneratingRandomEvents}
                    generatorMessage={generatorMessage}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Single Mobile Backdrop Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[90] backdrop-blur-sm lg:hidden transition-all duration-500 ease-in-out",
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )} 
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Floating Action Button (Mobile Sidebar Toggle) */}
      <div className="fixed bottom-6 right-6 z-[110] lg:hidden">
        <Button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-primary-glow transition-all active:scale-95 flex items-center justify-center border-none backdrop-blur-md"
          title="Toggle Volumes & Devices"
        >
          {isSidebarOpen ? <PanelLeftClose className="h-6 w-6" /> : <PanelLeft className="h-6 w-6" />}
        </Button>
      </div>

      {isDebugMode && (
        <div className="fixed bottom-4 left-3 z-[100] md:left-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/20 border border-warning/30 text-warning text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-lg">
            <ShieldCheck className="h-3 w-3" />
            Debug Mode Active
          </div>
        </div>
      )}
    </div>
  )
}

function normalizeTopicPath(value?: string | null) {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return undefined
  return trimmed.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

const RANDOM_PATHS = [
  'ops/cron/nightly-backup',
  'app/frontend/messages',
  'team-a/project-x/task/planner',
  'team-b/pipeline/ingest',
  'ml/trainer/retrain',
  'payments/reconciler/daily',
  'search/indexer/shard-3',
  'support/webhook/slack-sync',
] as const

const RANDOM_TEST_MESSAGES = [
  'Synthetic push delivery check',
  'Notification channel smoke test',
  'Randomized test signal from dashboard',
  'End-to-end browser alert validation',
  'Service worker wakeup verification',
] as const

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

function buildRandomTestEvent() {
  const path = pickRandom(RANDOM_PATHS)
  const testId = randomId('test')
  const status = Math.random() < 0.75 ? 'idle' : 'busy'

  return {
    path,
    payload: {
      time: new Date().toISOString(),
      status,
      content: `TEST EVENT ${testId}: ${pickRandom(RANDOM_TEST_MESSAGES)}`,
    },
  }
}
