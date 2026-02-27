import { useDeferredValue, useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Activity, Terminal, LayoutGrid, ListTree, Info, Bell, BellOff, Volume2, VolumeX, ShieldCheck, Shuffle } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import type { EventStatus } from '~/lib/types'
import { ensurePathAlias, fetchCurrentWatcher, publishEvent, resolvePathAlias } from '~/lib/client-api'
import { LogStream } from './log-stream'
import { StatCards } from './stat-cards'
import { StatusBoard } from './status-board'
import { TopicSelector } from './topic-selector'
import { useDashboardData } from './use-dashboard-data'
import { cn } from '~/lib/utils'
import { getClientWatcherKey, getClientWatcherName, NotificationManager } from '~/lib/notifications'
import { Authenticated, Unauthenticated } from 'convex/react'
import { SignIn, UserMenu } from '~/components/auth/auth-ui'

interface DashboardViewProps {
  mode: 'logs' | 'status'
  workspace?: string
}

export function DashboardView({ mode, workspace }: DashboardViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [isSoundEnabled, setIsSoundEnabled] = useState(NotificationManager.isEnabled())
  const [isBellEnabled, setIsBellEnabled] = useState(false)
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [isGeneratingRandomEvents, setIsGeneratingRandomEvents] = useState(false)
  const [generatorMessage, setGeneratorMessage] = useState<string | null>(null)
  const [isHydratingFilter, setIsHydratingFilter] = useState(true)
  
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

      setIsHydratingFilter(true)

      let cancelled = false
      const watcherKey = getClientWatcherKey()
      const watcherName = getClientWatcherName()

      const hydrateFilterFromUrl = async () => {
        const params = new URLSearchParams(window.location.search)
        const aliasId = params.get('filter')?.trim()
        const directPath = normalizeTopicPath(params.get('path') ?? undefined)

        if (aliasId) {
          try {
            const resolved = await resolvePathAlias(aliasId, workspace)
            if (!cancelled) {
              setSelectedTopic(normalizeTopicPath(resolved.path))
            }
          } catch {
            if (!cancelled) {
              setSelectedTopic(directPath)
            }
          } finally {
            if (!cancelled) {
              setIsHydratingFilter(false)
            }
          }
          return
        }

        if (!cancelled) {
          setSelectedTopic(directPath)
          setIsHydratingFilter(false)
        }
      }

      const syncCurrentWatcher = async () => {
        try {
          const watcher = await fetchCurrentWatcher({
            workspace,
            watcherKey,
            watcherName,
          })
          if (cancelled) return

          setIsBellEnabled(Boolean(watcher.enabled))

          if (watcher.enabled && 'Notification' in window && window.Notification.permission === 'granted') {
            await NotificationManager.ensureBackgroundPush(workspace)
          }
        } catch (error) {
          console.warn('Failed to sync current watcher', error)
        }
      }

      void hydrateFilterFromUrl()
      void syncCurrentWatcher()

      const timer = window.setInterval(() => {
        void syncCurrentWatcher()
      }, 15_000)

      return () => {
        cancelled = true
        window.clearInterval(timer)
      }
    }
  }, [workspace])

  useEffect(() => {
    if (typeof window === 'undefined' || isHydratingFilter) return

    let cancelled = false
    const syncFilterParam = async () => {
      const url = new URL(window.location.href)

      if (!selectedTopic) {
        url.searchParams.delete('filter')
        url.searchParams.delete('path')
        window.history.replaceState({}, '', url.toString())
        return
      }

      try {
        const alias = await ensurePathAlias(selectedTopic, workspace)
        if (cancelled) return
        url.searchParams.set('filter', alias.aliasId)
        url.searchParams.delete('path')
      } catch {
        if (cancelled) return
        url.searchParams.delete('filter')
        url.searchParams.set('path', selectedTopic)
      }

      window.history.replaceState({}, '', url.toString())
    }

    void syncFilterParam()

    return () => {
      cancelled = true
    }
  }, [selectedTopic, workspace, isHydratingFilter])

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
    if (isBellEnabled) {
      await NotificationManager.disableBackgroundPush(workspace)
      setIsBellEnabled(false)
      return
    }

    const enabled = await NotificationManager.enableBackgroundPush(workspace)
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
      await publishEvent(testEvent.path, testEvent.payload, workspace)
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
    const haystack = `${event.path} ${event.content ?? ''} ${event.entityId ?? ''} ${event.runId ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })

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

  const dashboardContent = (
    <div className="flex h-[100svh] min-h-[100svh] w-full flex-col overflow-hidden text-foreground md:h-dvh md:min-h-dvh">
      
      {/* PROFESSIONAL NAV BAR */}
      <header className="z-50 shrink-0 border-b border-border/30 bg-background/70 px-3 py-2.5 backdrop-blur-md md:px-8 md:py-2">
        <div className="flex flex-wrap items-start gap-3 md:items-center md:gap-4">
        {/* Branding */}
        <div className="order-1 flex min-w-0 shrink-0 items-center gap-2 md:gap-3 group cursor-default">
          <div className="flex h-8 w-8 md:h-9 items-center justify-center rounded-lg md:rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
            <Terminal className="h-4 w-4 md:h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm md:text-base font-black tracking-tight text-foreground uppercase">Tailwatch</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", data ? "bg-success shadow-[0_0_8px_oklch(from_var(--success)_l_c_h_/_0.5)]" : "bg-muted-foreground/40")} />
              <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-tight">
                {data ? "Live Feed" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher & Stats */}
        <div className="order-3 flex w-full min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap md:order-3 md:gap-4">
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
              className={cn("h-8 w-8", isBellEnabled ? "text-primary" : "text-muted-foreground/40")}
              onClick={requestNotifications}
              title={
                typeof window !== 'undefined' && !('Notification' in window) 
                  ? "Notifications not supported" 
                  : typeof window !== 'undefined' && !window.isSecureContext
                    ? "Notifications require HTTPS"
                    : isBellEnabled 
                      ? "Disable background push notifications" 
                      : "Enable background push notifications"
              }
            >
              {isBellEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="no-scrollbar flex max-w-full items-center overflow-x-auto rounded-lg border border-primary/10 bg-primary/5 p-1 shadow-sm backdrop-blur-sm">
            <Link
              to="/$workspaceId"
              params={{ workspaceId: workspace ?? 'default' }}
              activeProps={{ className: 'bg-background text-primary border-border/60 shadow-sm' }}
              className="flex items-center gap-1.5 px-2.5 md:px-3.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground border border-transparent"
            >
              <ListTree className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logs</span>
            </Link>
            <Link
              to={workspace && workspace !== 'default' ? '/$workspaceId/status' : '/status'}
              params={workspace && workspace !== 'default' ? { workspaceId: workspace } : {}}
              activeProps={{ className: 'bg-background text-primary border-border/60 shadow-sm' }}
              className="flex items-center gap-1.5 px-2.5 md:px-3.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground border border-transparent"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Registry</span>
            </Link>
          </nav>

          <UserMenu workspace={workspace} />
        </div>

        {/* Global Navigation Input */}
        <div className="order-2 w-full min-w-0 md:order-2 md:flex-1">
          {data && (
            <TopicSelector
              tree={data.topicTree}
              selectedTopic={selectedTopic}
              onSelectTopic={(topic) => setSelectedTopic(normalizeTopicPath(topic))}
            />
          )}
        </div>
        </div>
      </header>

      {/* VIEWPORT CONTENT */}
      <main className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex-1 min-h-0 px-3 py-3 md:px-8 md:py-4 flex flex-col gap-4">
          {data && (
            <div className="xl:hidden scroll-thin -mx-1 overflow-x-auto pb-1">
              <div className="min-w-max px-1">
                <StatCards stats={data.stats} />
              </div>
            </div>
          )}

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
                      statusFilter={statusFilter}
                      onStatusFilterChange={setStatusFilter}
                      lastSeenAt={lastSeenAt}
                      onAcknowledge={markAllSeen}
                      headerActions={randomBurstControl}
                    />
                  ) : (
                    <StatusBoard 
                      rows={data.entities} 
                      lastSeenAt={lastSeenAt} 
                      onAcknowledge={markAllSeen}
                      headerActions={randomBurstControl}
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

function normalizeTopicPath(value?: string | null) {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return undefined
  return trimmed.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

type RandomTestEventDraft = {
  path: string
  payload: {
    status?: string
    timestamp?: string
    content: string
    meta?: Record<string, string | number | boolean>
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
  const source = pickRandom(RANDOM_PATHS)
  const testId = randomId('test')
  const status = Math.random() < 0.75 ? 'idle' : 'busy'

  return {
    path: source.path,
    payload: {
      timestamp: new Date().toISOString(),
      status,
      content: `TEST EVENT ${testId}: ${pickRandom(RANDOM_TEST_MESSAGES)}`,
      meta: {
        source: 'dashboard-test-button',
        test: true,
        target: source.entityId,
      },
    },
  }
}
