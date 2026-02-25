import { useDeferredValue, useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Activity, Terminal, LayoutGrid, ListTree, Info, Bell, BellOff, Volume2, VolumeX, CheckCircle2, ShieldCheck, Shuffle } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import type { EventType } from '~/lib/types'
import { publishEvent } from '~/lib/client-api'
import { LogStream } from './log-stream'
import { StatCards } from './stat-cards'
import { StatusBoard } from './status-board'
import { TopicSelector } from './topic-selector'
import { useDashboardData } from './use-dashboard-data'
import { cn } from '~/lib/utils'
import { NotificationManager } from '~/lib/notifications'
import { Authenticated, Unauthenticated } from 'convex/react'
import { SignIn, UserMenu } from '~/components/auth/auth-ui'

interface DashboardViewProps {
  mode: 'logs' | 'status'
  workspace?: string
}

export function DashboardView({ mode, workspace }: DashboardViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all')
  const [isSoundEnabled, setIsSoundEnabled] = useState(NotificationManager.isEnabled())
  const [hasPushPermission, setHasPushPermission] = useState(false)
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [isGeneratingRandomEvents, setIsGeneratingRandomEvents] = useState(false)
  const [generatorMessage, setGeneratorMessage] = useState<string | null>(null)
  
  const deferredSearch = useDeferredValue(search)

  const { data, error, isLoading, markAllSeen, lastSeenAt, refresh } = useDashboardData({
    mode,
    workspace,
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

      if ('Notification' in window) {
        void NotificationManager.isPushSubscribed().then(setHasPushPermission)
      }
    }
  }, [])

  const toggleSound = () => {
    if (isSoundEnabled) {
      NotificationManager.disableSound()
      setIsSoundEnabled(false)
    } else {
      NotificationManager.enableSound()
      setIsSoundEnabled(true)
    }
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
    if (hasPushPermission) {
      await NotificationManager.disableBackgroundPush()
      setHasPushPermission(false)
      return
    }

    const enabled = await NotificationManager.enableBackgroundPush(workspace)
    setHasPushPermission(enabled)
  }

  const generateRandomEvents = async () => {
    if (isGeneratingRandomEvents) return

    setIsGeneratingRandomEvents(true)
    setGeneratorMessage(null)

    const batch = buildRandomEventBurst()
    const results = await Promise.allSettled(
      batch.map((entry) => publishEvent(entry.path, entry.payload, workspace)),
    )

    const succeeded = results.filter((result) => result.status === 'fulfilled').length
    const failed = results.length - succeeded

    refresh()

    if (failed > 0) {
      setGeneratorMessage(`Generated ${succeeded}/${batch.length} events`)
    } else {
      setGeneratorMessage(`Generated ${succeeded} random events`)
    }

    setIsGeneratingRandomEvents(false)
  }

  const filteredEvents = (data?.events ?? []).filter((event) => {
    if (typeFilter !== 'all' && event.type !== typeFilter) return false
    if (!deferredSearch.trim()) return true
    const q = deferredSearch.toLowerCase()
    const haystack = `${event.path} ${event.content ?? ''} ${event.entityId ?? ''} ${event.runId ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })

  const dashboardContent = (
    <div className="flex h-screen w-full flex-col text-foreground">
      
      {/* PROFESSIONAL NAV BAR */}
      <header className="h-16 shrink-0 z-50 flex items-center px-4 md:px-8 gap-4 md:gap-8">
        {/* Branding */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0 group cursor-default">
          <div className="flex h-8 w-8 md:h-9 items-center justify-center rounded-lg md:rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
            <Terminal className="h-4 w-4 md:h-5" />
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-sm md:text-base font-black tracking-tight text-foreground uppercase">Tailwatch</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", data ? "bg-success shadow-[0_0_8px_oklch(from_var(--success)_l_c_h_/_0.5)]" : "bg-muted-foreground/40")} />
              <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-tight">
                {data ? "Live Feed" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>

        {/* Global Navigation Input */}
        <div className="flex-1 min-w-0">
          {data && (
            <TopicSelector tree={data.topicTree} selectedTopic={selectedTopic} onSelectTopic={setSelectedTopic} />
          )}
        </div>

        {/* View Switcher & Stats */}
        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          {data && <div className="hidden xl:block"><StatCards stats={data.stats} /></div>}
          
          <div className="flex items-center gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              className={cn("h-8 w-8", isSoundEnabled ? "text-primary" : "text-muted-foreground/40")}
              onClick={toggleSound}
              title={isSoundEnabled ? "Mute beep" : "Enable beep"}
            >
              {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className={cn("h-8 w-8", hasPushPermission ? "text-primary" : "text-muted-foreground/40")}
              onClick={requestNotifications}
              title={
                typeof window !== 'undefined' && !('Notification' in window) 
                  ? "Notifications not supported" 
                  : typeof window !== 'undefined' && !window.isSecureContext
                    ? "Notifications require HTTPS"
                    : hasPushPermission 
                      ? "Disable background push notifications" 
                      : "Enable background push notifications"
              }
            >
              {hasPushPermission ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
            <UserMenu />
          </div>

          <nav className="flex items-center p-1 bg-primary/5 rounded-lg border border-primary/10 shadow-sm backdrop-blur-sm">
            <Link
              to={workspace && workspace !== 'default' ? '/$workspaceId' : '/'}
              params={workspace && workspace !== 'default' ? { workspaceId: workspace } : {}}
              activeProps={{ className: 'bg-background text-primary border-border/60 shadow-sm' }}
              className="flex items-center gap-2 px-2.5 md:px-3.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground border border-transparent"
            >
              <ListTree className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Logs</span>
            </Link>
            <Link
              to={workspace && workspace !== 'default' ? '/$workspaceId/status' : '/status'}
              params={workspace && workspace !== 'default' ? { workspaceId: workspace } : {}}
              activeProps={{ className: 'bg-background text-primary border-border/60 shadow-sm' }}
              className="flex items-center gap-2 px-2.5 md:px-3.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground border border-transparent"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Registry</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 flex min-h-0">
        <div className="flex-1 min-h-0 px-4 md:px-8 py-4 flex flex-col gap-4">

          {error && (
            <Card className="border-destructive/20 bg-destructive/10 text-destructive-foreground backdrop-blur shadow-sm overflow-hidden shrink-0">
              <CardContent className="p-3 text-xs font-medium flex items-center gap-3">
                <Info className="h-4 w-4" />
                Error building snapshot: {error}
              </CardContent>
            </Card>
          )}

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
                      searchValue={search}
                      onSearchChange={setSearch}
                      typeFilter={typeFilter}
                      onTypeFilterChange={setTypeFilter}
                      lastSeenAt={lastSeenAt}
                      onAcknowledge={markAllSeen}
                    />
                  ) : (
                    <StatusBoard 
                      rows={data.entities} 
                      lastSeenAt={lastSeenAt} 
                      onAcknowledge={markAllSeen}
                    />
                  )}
                </div>
              ) : null}
          </div>

          <div className="shrink-0 flex items-center justify-start gap-2 pt-1">
            {generatorMessage && (
              <span className="text-[10px] font-semibold text-muted-foreground/80">
                {generatorMessage}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-md border-primary/20 bg-primary/5 px-2.5 text-[10px] font-bold tracking-tight text-primary"
              onClick={generateRandomEvents}
              disabled={isGeneratingRandomEvents}
              title="Publish a varied random burst of sample events"
            >
              <Shuffle className="h-3 w-3" />
              {isGeneratingRandomEvents ? 'Generating…' : 'Random Burst'}
            </Button>
          </div>
        </div>
      </main>
      {isDebugMode && (
        <div className="fixed bottom-4 left-4 z-[100]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/20 border border-warning/30 text-warning text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-lg">
            <ShieldCheck className="h-3 w-3" />
            Debug Mode Active
          </div>
        </div>
      )}
    </div>
  )

  if (isDebugMode) {
    return dashboardContent
  }

  return (
    <>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>
        {dashboardContent}
      </Authenticated>
    </>
  )
}

type RandomEventDraft = {
  path: string
  payload: {
    type: EventType
    timestamp?: string
    runId?: string
    entityId?: string
    entityType?: string
    level?: 'debug' | 'info' | 'warn' | 'error'
    status?: string
    content?: string
    meta?: Record<string, string | number | boolean>
    metrics?: Record<string, number>
  }
}

const RANDOM_PATHS = [
  { path: 'ops/cron/nightly-backup', entityId: 'nightly-backup', entityType: 'job' },
  { path: 'app/frontend/messages', entityId: 'websocket-client', entityType: 'service' },
  { path: 'team-a/project-x/task/planner', entityId: 'planner', entityType: 'task' },
  { path: 'team-b/pipeline/ingest', entityId: 'ingest', entityType: 'pipeline' },
  { path: 'ml/trainer/retrain', entityId: 'retrainer', entityType: 'worker' },
  { path: 'payments/reconciler/daily', entityId: 'reconciler', entityType: 'job' },
  { path: 'search/indexer/shard-3', entityId: 'indexer-shard-3', entityType: 'worker' },
  { path: 'support/webhook/slack-sync', entityId: 'slack-sync', entityType: 'integration' },
] as const

const RANDOM_MESSAGES = {
  start: [
    'Run started',
    'Starting execution window',
    'Worker accepted new task batch',
    'Pipeline bootstrap initialized',
  ],
  log: [
    'Fetched upstream metadata',
    'Queued 24 items for processing',
    'Retrying transient dependency timeout',
    'Applied config diff and reloaded',
    'Checkpoint written to object store',
  ],
  heartbeat: [
    'Still processing',
    'Progress heartbeat emitted',
    'Waiting on downstream ACK',
    'Worker healthy and active',
  ],
  status: [
    'Idle and waiting for next batch',
    'Drain mode enabled',
    'Backpressure detected',
    'Healthy with low queue depth',
  ],
  stop: [
    'Run completed successfully',
    'Processing window closed',
    'Task batch finished',
  ],
  error: [
    'Upstream API returned 502',
    'Disk quota threshold exceeded',
    'Rate limit exceeded on provider',
    'Schema mismatch in payload',
  ],
} as const

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T
}

function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i]
    copy[i] = copy[j]
    copy[j] = temp
  }
  return copy
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

function weightedEventType(): EventType {
  const roll = Math.random()
  if (roll < 0.2) return 'start'
  if (roll < 0.5) return 'log'
  if (roll < 0.67) return 'heartbeat'
  if (roll < 0.82) return 'status'
  if (roll < 0.92) return 'stop'
  return 'error'
}

function buildRandomEventBurst(): RandomEventDraft[] {
  const count = 3 + Math.floor(Math.random() * 4) // 3-6
  const paths = shuffleArray(RANDOM_PATHS)
  const forcedTypes = shuffleArray(['start', 'log', 'heartbeat', 'status', 'stop', 'error'] as const)

  return Array.from({ length: count }, (_, index) => {
    const source = paths[index % paths.length]
    const type = index < forcedTypes.length ? forcedTypes[index] : weightedEventType()
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 25_000)).toISOString()
    const runId = `${source.entityId}_${randomId('run')}`

    const base: RandomEventDraft = {
      path: source.path,
      payload: {
        type,
        timestamp,
        entityId: source.entityId,
        entityType: source.entityType,
        runId: type === 'status' ? undefined : runId,
        content: pickRandom(RANDOM_MESSAGES[type]),
        meta: {
          source: 'random-ui-generator',
          host: pickRandom(['worker-a', 'worker-b', 'edge-us', 'edge-eu']),
          burst: true,
        },
      },
    }

    if (type === 'log') {
      base.payload.level = pickRandom(['debug', 'info', 'warn'])
      if (Math.random() < 0.6) {
        base.payload.metrics = {
          queueDepth: Math.floor(Math.random() * 250),
          latencyMs: Math.floor(Math.random() * 800) + 20,
        }
      }
    }

    if (type === 'heartbeat') {
      base.payload.metrics = {
        progressPct: Math.floor(Math.random() * 100),
        throughputRps: Number((Math.random() * 40 + 1).toFixed(1)),
      }
    }

    if (type === 'status') {
      base.payload.status = pickRandom(['idle', 'working', 'stopped', 'error'])
    }

    if (type === 'start') {
      base.payload.status = 'working'
    }

    if (type === 'stop') {
      base.payload.status = pickRandom(['success', 'stopped', 'done'])
    }

    if (type === 'error') {
      base.payload.level = 'error'
      base.payload.status = pickRandom(['error', 'failed'])
      base.payload.metrics = {
        retries: Math.floor(Math.random() * 5) + 1,
      }
    }

    return base
  })
}
