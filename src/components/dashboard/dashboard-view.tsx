import { useDeferredValue, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { RefreshCw, Activity, Terminal, LayoutGrid } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { formatRelative } from '~/lib/format'
import type { EventType } from '~/lib/types'
import { LogStream } from './log-stream'
import { PublishPanel } from './publish-panel'
import { StatCards } from './stat-cards'
import { StatusBoard } from './status-board'
import { TopicSelector } from './topic-selector'
import { useDashboardData } from './use-dashboard-data'

interface DashboardViewProps {
  mode: 'logs' | 'status'
}

export function DashboardView({ mode }: DashboardViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all')
  const deferredSearch = useDeferredValue(search)

  const { data, error, isLoading, isRefreshing, refresh } = useDashboardData({
    mode,
    topicPrefix: selectedTopic,
  })

  const filteredEvents = (data?.events ?? []).filter((event) => {
    if (typeFilter !== 'all' && event.type !== typeFilter) return false
    if (!deferredSearch.trim()) return true
    const q = deferredSearch.toLowerCase()
    const haystack = `${event.path} ${event.content ?? ''} ${event.entityId ?? ''} ${event.runId ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground animate-in fade-in duration-1000">
      
      {/* LEFT SIDEBAR (Navigation & Filters) */}
      <aside className="w-72 flex flex-col border-r border-border/40 bg-background/95 backdrop-blur z-20 shrink-0 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.5)]">
        {/* Branding & Status */}
        <div className="flex h-16 items-center px-6 border-b border-border/40 shrink-0 gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary shrink-0 shadow-inner border border-primary/20">
            <Terminal className="h-4 w-4" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-bold leading-none tracking-tight text-foreground truncate">Tailwatch</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${data ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-muted-foreground/50'}`} />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                {data ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="p-4 space-y-1.5 border-b border-border/20 shrink-0">
          <Link
            to="/"
            activeProps={{ className: 'bg-primary/10 text-primary font-medium ring-1 ring-primary/20 shadow-sm' }}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground/70 hover:bg-white/5 transition-all"
          >
            <Terminal className="h-4 w-4 opacity-70" />
            Event Stream
          </Link>
          <Link
            to="/status"
            activeProps={{ className: 'bg-primary/10 text-primary font-medium ring-1 ring-primary/20 shadow-sm' }}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground/70 hover:bg-white/5 transition-all"
          >
            <LayoutGrid className="h-4 w-4 opacity-70" />
            Entity Status Matrix
          </Link>
        </nav>

        {/* Contextual Sidebar: Topic Selector */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0 scroll-thin">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Namespace Filter</h3>
          {data ? (
            <div className="flex-1 min-h-0">
              <TopicSelector tree={data.topicTree} selectedTopic={selectedTopic} onSelectTopic={setSelectedTopic} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-mono px-1">
              <RefreshCw className="h-3 w-3 animate-spin" /> Fetching nodes...
            </div>
          )}
        </div>
      </aside>

      {/* CENTER & RIGHT (Main Content Area) */}
      <main className="flex-1 flex flex-col min-w-0 bg-black/20 relative">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 pointer-events-none" />

        {/* Topbar: Title, Stats & Sync */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-border/40 bg-background/40 backdrop-blur z-20 shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight truncate uppercase tracking-widest text-primary/80">
              {mode === 'logs' ? 'System.EventStream' : 'Entity.StatusMatrix'}
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-background/60 border border-border/40 text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              <Activity className="h-3 w-3 text-emerald-500" />
              {data ? `SYNCED_${formatRelative(data.fetchedAt).toUpperCase().replace(/\s+/g, '_')}` : 'SYNCING...'}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar">
            {data && <StatCards stats={data.stats} />}
            <Button 
              variant="outline" 
              size="sm"
              onClick={refresh} 
              disabled={isRefreshing}
              className="h-8 border-border/60 bg-background/50 backdrop-blur hover:bg-muted font-mono text-[10px] uppercase tracking-widest"
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
              {isRefreshing ? 'SYNC' : 'REFRESH'}
            </Button>
          </div>
        </header>

        {/* Error State Banner */}
        {error && (
          <div className="px-6 pt-4 shrink-0 z-30 relative">
            <Card className="border-red-900/50 bg-red-950/40 text-red-400 backdrop-blur shadow-lg">
              <CardContent className="p-3 text-xs font-mono flex items-center gap-3">
                <Activity className="h-3 w-3 text-red-400" />
                {error}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Application Canvas */}
        <div className="flex-1 flex overflow-hidden z-10 p-6">
          
          {/* Main List / Grid */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
             {isLoading && !data ? (
                <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/20 backdrop-blur shadow-sm">
                  <div className="flex items-center gap-3 text-muted-foreground/60 font-mono text-sm uppercase tracking-widest">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary/70" />
                    Initializing data stream...
                  </div>
                </div>
              ) : data ? (
                <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
                  {mode === 'logs' ? (
                    <LogStream
                      events={filteredEvents}
                      searchValue={search}
                      onSearchChange={setSearch}
                      typeFilter={typeFilter}
                      onTypeFilterChange={setTypeFilter}
                    />
                  ) : (
                    <StatusBoard rows={data.entities} />
                  )}
                </div>
              ) : null}
          </div>

          {/* Right Sidebar: Injector (Logs mode only) */}
          {mode === 'logs' && data && (
            <aside className="w-80 ml-6 shrink-0 border border-border/40 rounded-xl bg-background/40 backdrop-blur flex flex-col overflow-y-auto scroll-thin shadow-xl">
              <div className="p-6">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 border-b border-border/20 pb-2">Debug Utilities</h3>
                <PublishPanel onPublished={refresh} />
              </div>
            </aside>
          )}

        </div>
      </main>

    </div>
  )
}
