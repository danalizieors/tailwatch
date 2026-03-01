import { useDeferredValue, useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  Activity,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  Copy,
  Filter,
  Hash,
  Info,
  LayoutGrid,
  Search,
  ShieldCheck,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import type { EventStatus } from '~/lib/types'
import { api } from '../../../convex/_generated/api'
import { LogStream } from './log-stream'
import { StatCards } from './stat-cards'
import { StatusBoard } from './status-board'
import { TopicSelector } from './topic-selector'
import { useDashboardData } from './use-dashboard-data'
import { AppShellHeader } from '~/components/layout/app-shell-header'
import { cn } from '~/lib/utils'
import { NotificationManager } from '~/lib/notifications'

interface DashboardViewProps {
  mode: 'logs' | 'status'
  volume?: string
}

const EVENT_STATUS_OPTIONS: Array<EventStatus | 'all'> = ['all', 'busy', 'idle']

export function DashboardView({ mode, volume }: DashboardViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [isSoundEnabled, setIsSoundEnabled] = useState(NotificationManager.isEnabled())
  const [isBellEnabled, setIsBellEnabled] = useState(false)
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [isGeneratingRandomEvents, setIsGeneratingRandomEvents] = useState(false)
  const [generatorMessage, setGeneratorMessage] = useState<string | null>(null)
  const [copiedCurlVariant, setCopiedCurlVariant] = useState<'header' | 'url' | null>(null)
  const [volumePublishKey, setVolumePublishKey] = useState<string | null>(null)
  const [volumeOptions, setVolumeOptions] = useState<string[]>(['personal'])
  const [isHydratingFilter, setIsHydratingFilter] = useState(true)
  const convexApi = api as any
  const publish = useMutation(convexApi.events.publish)
  const publishByKey = useMutation(convexApi.events.publishByKey)
  const managedVolumes = useQuery(convexApi.volumes.listManagedVolumes, {}) as
    | Array<{ name: string; isDefault?: boolean; key?: { value?: string } }>
    | undefined

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

  useEffect(() => {
    if (!copiedCurlVariant || typeof window === 'undefined') return
    const timer = window.setTimeout(() => {
      setCopiedCurlVariant(null)
    }, 1800)
    return () => {
      window.clearTimeout(timer)
    }
  }, [copiedCurlVariant])

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
    if (typeof window === 'undefined') return

    const nextVolume = nextVolumeRaw.trim() || 'personal'
    const currentUrl = new URL(window.location.href)
    const targetPath =
      mode === 'status'
        ? nextVolume === 'personal'
          ? '/status'
          : `/${encodeURIComponent(nextVolume)}/status`
        : `/${encodeURIComponent(nextVolume)}`

    const nextUrl = new URL(targetPath, currentUrl.origin)
    const filter = currentUrl.searchParams.get('filter')
    const path = currentUrl.searchParams.get('path')
    if (filter?.trim()) nextUrl.searchParams.set('filter', filter)
    if (path?.trim()) nextUrl.searchParams.set('path', path)

    window.location.assign(nextUrl.toString())
  }

  const requestNotifications = async () => {
    if (typeof window !== 'undefined') {
      if (!('Notification' in window)) {
        alert('Notifications are not supported in this browser.')
        return
      }
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Background push is not supported in this browser.')
        return
      }
      if (!window.isSecureContext) {
        alert('Browser security requirements: Push notifications require a secure context (HTTPS or localhost).')
        return
      }
      if (window.Notification.permission === 'denied') {
        alert('Notification permission was previously denied. Please reset it in your browser settings to enable notifications.')
        return
      }
    }
    if (isBellEnabled) {
      await NotificationManager.disableBackgroundPush()
      setIsBellEnabled(false)
      return
    }

    const enabled = await NotificationManager.enableBackgroundPush()
    setIsBellEnabled(enabled)
    if (!enabled && typeof window !== 'undefined' && window.Notification.permission === 'granted') {
      alert(NotificationManager.getLastPushError() ?? 'Unable to enable background push. Verify backend VAPID configuration and try again.')
    }
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

  const curlFilterPath = selectedTopic
  const curlExampleBody = useMemo(() => buildRandomCurlFrontmatterBody(), [curlFilterPath, volumePublishKey])
  const curlCommands =
    curlFilterPath && curlFilterPath.trim() && volumePublishKey
      ? buildPublishCurlCommands({
          baseUrl: typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin,
          key: volumePublishKey,
          path: curlFilterPath,
          body: curlExampleBody,
        })
      : null

  const randomBurstControl = (
    <>
      {generatorMessage && (
        <span className="hidden md:inline text-[10px] font-semibold text-muted-foreground/80">
          {generatorMessage}
        </span>
      )}
      <Button
        size="sm"
        variant="outline"
        className="h-8 rounded-lg border-primary/20 bg-primary/5 px-3 text-[9px] font-black uppercase tracking-widest text-primary gap-1.5"
        onClick={generateRandomEvents}
        disabled={isGeneratingRandomEvents}
        title="Publish one random test event"
      >
        <Shuffle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{isGeneratingRandomEvents ? 'Sending…' : 'Send Test'}</span>
        <span className="sm:hidden">{isGeneratingRandomEvents ? 'Sending…' : 'Test'}</span>
      </Button>
    </>
  )

  const headerTopRight = (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="ghost"
        className={cn('h-8 w-8', isSoundEnabled ? 'text-primary' : 'text-muted-foreground/40')}
        onClick={toggleSound}
        title={isSoundEnabled ? 'Mute beep' : 'Enable beep'}
      >
        {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className={cn('h-8 w-8', isBellEnabled ? 'text-primary' : 'text-muted-foreground/40')}
        onClick={requestNotifications}
        title={
          typeof window !== 'undefined' && !('Notification' in window)
            ? 'Notifications not supported'
            : typeof window !== 'undefined' && !window.isSecureContext
              ? 'Notifications require HTTPS'
              : isBellEnabled
                ? 'Disable background push notifications'
                : 'Enable background push notifications'
        }
      >
        {isBellEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      </Button>
    </div>
  )

  const selectedPathQuery = selectedTopic?.trim() ? `?path=${encodeURIComponent(selectedTopic)}` : ''
  const logsModeHref = `/${encodeURIComponent(activeVolume)}${selectedPathQuery}`
  const statusModeBaseHref = activeVolume === 'personal' ? '/status' : `/${encodeURIComponent(activeVolume)}/status`
  const statusModeHref = `${statusModeBaseHref}${selectedPathQuery}`

  const modeSwitchButtons = (
    <div className="inline-flex items-center rounded-lg border border-primary/15 bg-primary/5 p-1">
      <a
        href={logsModeHref}
        className={cn(
          'inline-flex items-center rounded-md border border-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
          mode === 'logs'
            ? 'bg-background text-primary border-border/60 shadow-sm'
            : 'text-muted-foreground/70 hover:text-foreground',
        )}
      >
        Logs
      </a>
      <a
        href={statusModeHref}
        className={cn(
          'inline-flex items-center rounded-md border border-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
          mode === 'status'
            ? 'bg-background text-primary border-border/60 shadow-sm'
            : 'text-muted-foreground/70 hover:text-foreground',
        )}
      >
        Status
      </a>
    </div>
  )

  const eventsHeaderRow = (
    <div className="flex flex-col gap-2 rounded-lg border border-border/40 bg-card/50 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
          {mode === 'logs' ? <Hash className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
        </div>
        <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-tight">
          {mode === 'logs' ? 'Event Log' : 'Path Registry'}
        </h2>
        <span className="text-[10px] font-bold text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded-md ml-1 border border-border/10">
          {mode === 'logs' ? `${filteredEvents.length} ENTRIES` : `${data?.entities.length ?? 0} TRACKED`}
        </span>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-lg border-primary/20 bg-primary/5 px-2.5 text-[9px] font-black uppercase tracking-widest text-primary gap-1.5 hover:bg-primary/10 sm:px-3"
          onClick={markAllSeen}
        >
          <CheckCircle2 className="h-3 w-3" />
          <span className="hidden sm:inline">Acknowledge</span>
          <span className="sm:hidden">Ack</span>
        </Button>
        {randomBurstControl}

        {mode === 'logs' ? (
          <>
            <div className="group relative order-last basis-full sm:order-none sm:basis-auto sm:flex-none sm:min-w-[11rem]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
              <input
                className="h-8 w-full sm:w-40 lg:w-56 rounded-lg border border-border/40 bg-background/30 pl-8 pr-4 text-[11px] focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all placeholder:text-muted-foreground/50 font-bold uppercase tracking-tight"
                placeholder="Filter entries..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-border/40 bg-background/30 px-2.5 shadow-xs">
              <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />
              <select
                className="bg-transparent text-[10px] font-bold uppercase tracking-tight outline-none cursor-pointer text-foreground/70"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as EventStatus | 'all')}
              >
                {EVENT_STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value} className="bg-background text-foreground uppercase">
                    {value === 'all' ? 'All Statuses' : value}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

      </div>
    </div>
  )

  const dashboardContent = (
    <div className="flex h-[100svh] min-h-[100svh] w-full flex-col overflow-hidden text-foreground md:h-dvh md:min-h-dvh">
      <AppShellHeader
        current="events"
        activeVolume={activeVolume}
        volumeChoices={volumeChoices}
        showVolumeSelector
        onVolumeChange={switchVolume}
        topRight={headerTopRight}
        eventsTopRow={eventsHeaderRow}
        bottomRight={
          data ? (
            <div className="flex min-w-0 items-center gap-2">
              <TopicSelector
                tree={data.topicTree}
                selectedTopic={selectedTopic}
                onSelectTopic={(topic) => setSelectedTopic(normalizeTopicPath(topic))}
              />
              <div className="shrink-0 overflow-x-auto">
                <div className="min-w-max rounded-lg border border-border/40 bg-card/50">
                  <StatCards stats={data.stats} />
                </div>
              </div>
            </div>
          ) : null
        }
        belowFilter={modeSwitchButtons}
      />

      {/* VIEWPORT CONTENT */}
      <main className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex-1 min-h-0 px-3 py-3 md:px-8 md:py-4 flex flex-col gap-4">
          {error && (
            <Card className="border-destructive/20 bg-destructive/10 text-destructive-foreground backdrop-blur shadow-sm overflow-hidden shrink-0">
              <CardContent className="p-3 text-xs font-medium flex items-center gap-3">
                <Info className="h-4 w-4" />
                Error building snapshot: {error}
              </CardContent>
            </Card>
          )}

          <Card className="border-primary/20 bg-primary/5 backdrop-blur shadow-sm overflow-hidden shrink-0">
            <CardContent className="p-3 md:p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/90">Publish With Curl</p>
                  <p className="text-xs text-muted-foreground">
                    {!curlFilterPath
                      ? 'Select a path filter to generate a curl command for that path.'
                      : !volumePublishKey
                        ? 'No publish alias found for this volume.'
                        : `Posts to filtered path: ${curlFilterPath}`
                    }
                  </p>
                  {volumePublishKey ? (
                    <p className="text-[10px] text-muted-foreground/80">
                      Using volume alias: <span className="font-mono">{volumePublishKey}</span>
                    </p>
                  ) : null}
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">Two options</span>
              </div>
              {curlCommands ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Header alias</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                        onClick={() => {
                          void navigator.clipboard.writeText(curlCommands.header)
                          setCopiedCurlVariant('header')
                        }}
                      >
                        {copiedCurlVariant === 'header' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedCurlVariant === 'header' ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <pre className="w-full overflow-x-auto rounded-lg border border-border/60 bg-card/80 p-2.5 text-[10px] leading-5 text-foreground md:text-[11px]">
                      <code>{curlCommands.header}</code>
                    </pre>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Key in URL</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                        onClick={() => {
                          void navigator.clipboard.writeText(curlCommands.url)
                          setCopiedCurlVariant('url')
                        }}
                      >
                        {copiedCurlVariant === 'url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedCurlVariant === 'url' ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <pre className="w-full overflow-x-auto rounded-lg border border-border/60 bg-card/80 p-2.5 text-[10px] leading-5 text-foreground md:text-[11px]">
                      <code>{curlCommands.url}</code>
                    </pre>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex-1 min-h-0 flex flex-col">
             {isLoading && !data ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-card/20 backdrop-blur-sm shadow-sm">
                  <Activity className="h-8 w-8 text-primary/40 mb-4" />
                  <div className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest">
                    Synchronizing Telemetry...
                  </div>
                </div>
              ) : data ? (
                <div className="flex-1 min-h-0">
                  {mode === 'logs' ? (
                    <LogStream
                      events={filteredEvents}
                      lastSeenAt={lastSeenAt}
                    />
                  ) : (
                    <StatusBoard 
                      rows={data.entities} 
                      lastSeenAt={lastSeenAt} 
                    />
                  )}
                </div>
              ) : null}
          </div>
        </div>
      </main>
      {isDebugMode && (
        <div className="fixed bottom-4 left-3 z-[100] md:left-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/20 border border-warning/30 text-warning text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-lg">
            <ShieldCheck className="h-3 w-3" />
            Debug Mode Active
          </div>
        </div>
      )}
    </div>
  )

  return dashboardContent
}

function normalizeTopicPath(value?: string | null) {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return undefined
  return trimmed.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function encodeTopicPathForUrl(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function buildPublishCurlCommands(input: { baseUrl: string; key: string; path: string; body: string }) {
  const baseUrl = input.baseUrl.replace(/\/+$/g, '')
  const encodedKey = encodeURIComponent(input.key)
  const encodedPath = encodeTopicPathForUrl(input.path)
  const escapedBody = escapeShellSingleQuoted(input.body)
  return {
    header: `curl "${baseUrl}/api/publish/${encodedPath}" -H "x-volume-key: ${input.key}" -d '${escapedBody}'`,
    url: `curl "${baseUrl}/api/publish/${encodedKey}/${encodedPath}" -d '${escapedBody}'`,
  }
}

function escapeShellSingleQuoted(value: string) {
  return value.replace(/'/g, `'"'"'`)
}

function buildRandomCurlFrontmatterBody() {
  const status = Math.random() < 0.5 ? 'busy' : 'idle'
  const content = `${pickRandom(RANDOM_TEST_MESSAGES)} (${randomId('curl')})`
  return `${status} --- ${content}`
}

type RandomTestEventDraft = {
  path: string
  payload: {
    time?: string
    status?: string
    content: string
  }
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

function buildRandomTestEvent(): RandomTestEventDraft {
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
