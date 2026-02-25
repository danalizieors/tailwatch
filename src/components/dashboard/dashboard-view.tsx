import { useDeferredValue, useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Activity, Terminal, LayoutGrid, ListTree, Info, Bell, BellOff, Volume2, VolumeX, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import type { EventType } from '~/lib/types'
import { LogStream } from './log-stream'
import { StatCards } from './stat-cards'
import { StatusBoard } from './status-board'
import { TopicSelector } from './topic-selector'
import { useDashboardData } from './use-dashboard-data'
import { cn } from '~/lib/utils'
import { NotificationManager } from '~/lib/notifications'

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
  
  const deferredSearch = useDeferredValue(search)

  const { data, error, isLoading, markAllSeen, lastSeenAt } = useDashboardData({
    mode,
    workspace,
    topicPrefix: selectedTopic,
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPushPermission(window.Notification.permission === 'granted')
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
    const granted = await NotificationManager.requestPushPermission()
    setHasPushPermission(granted)
  }

  const filteredEvents = (data?.events ?? []).filter((event) => {
    if (typeFilter !== 'all' && event.type !== typeFilter) return false
    if (!deferredSearch.trim()) return true
    const q = deferredSearch.toLowerCase()
    const haystack = `${event.path} ${event.content ?? ''} ${event.entityId ?? ''} ${event.runId ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })

  return (
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
              title={hasPushPermission ? "Notifications active" : "Enable push notifications"}
            >
              {hasPushPermission ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
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
        </div>
      </main>
    </div>
  )
}

