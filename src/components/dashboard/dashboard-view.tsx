import { useDeferredValue, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { RefreshCw, Activity, Terminal, LayoutGrid, ListTree } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import type { EventType } from '~/lib/types'
import { LogStream } from './log-stream'
import { StatCards } from './stat-cards'
import { StatusBoard } from './status-board'
import { TopicSelector } from './topic-selector'
import { useDashboardData } from './use-dashboard-data'
import { cn } from '~/lib/utils'

interface DashboardViewProps {
  mode: 'logs' | 'status'
}

export function DashboardView({ mode }: DashboardViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all')
  const deferredSearch = useDeferredValue(search)

  const { data, error, isLoading } = useDashboardData({
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
    <div className="flex h-screen w-full flex-col bg-background text-foreground selection:bg-primary/20 animate-in fade-in duration-700">
      
      {/* PANORAMIC TOP BAR */}
      <header className="h-16 shrink-0 border-b border-white/5 bg-background/50 backdrop-blur-xl z-50 flex items-center px-6 gap-8">
        {/* Branding */}
        <div className="flex items-center gap-3 shrink-0 group cursor-default">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary/20 transition-all shadow-[0_0_15px_-5px_rgba(var(--primary),0.3)]">
            <Terminal className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-none tracking-tight text-foreground uppercase tracking-widest">Tailwatch</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", data ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30")} />
              <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/60 font-mono">
                {data ? "LIVE_DATA_FEED" : "CONNECTING..."}
              </span>
            </div>
          </div>
        </div>

        {/* TOP CENTER: Global Address Bar (Context) */}
        <div className="flex-1 max-w-2xl">
          {data && (
            <TopicSelector tree={data.topicTree} selectedTopic={selectedTopic} onSelectTopic={setSelectedTopic} />
          )}
        </div>

        {/* View Switcher & Stats */}
        <div className="flex items-center gap-4 shrink-0">
          {data && <div className="hidden 2xl:block"><StatCards stats={data.stats} /></div>}
          
          <nav className="flex items-center p-1 bg-white/5 rounded-xl border border-white/5 shadow-inner">
            <Link
              to="/"
              activeProps={{ className: 'bg-white/10 text-primary border-white/10 shadow-sm' }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all hover:text-foreground border border-transparent"
            >
              <ListTree className="h-3.5 w-3.5" />
              Stream
            </Link>
            <Link
              to="/status"
              activeProps={{ className: 'bg-white/10 text-primary border-white/10 shadow-sm' }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all hover:text-foreground border border-transparent"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Matrix
            </Link>
          </nav>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sub-header background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none opacity-50" />

        {/* Primary Content Canvas */}
        <div className="flex-1 overflow-hidden p-6 z-10 flex flex-col">
          {error && (
            <div className="mb-6 animate-in slide-in-from-top-2">
              <Card className="border-red-900/50 bg-red-950/20 text-red-400 backdrop-blur shadow-xl">
                <CardContent className="p-3 text-xs font-mono flex items-center gap-3">
                  <Activity className="h-3.5 w-3.5" />
                  [ERROR]: {error}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col">
             {isLoading && !data ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm shadow-2xl">
                  <div className="relative flex items-center justify-center mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                    <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                  </div>
                  <div className="text-muted-foreground/60 font-mono text-xs uppercase tracking-[0.2em] animate-pulse">
                    Initializing Data Matrix...
                  </div>
                </div>
              ) : data ? (
                <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden animate-in fade-in zoom-in-95 duration-500">
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
        </div>
      </main>
    </div>
  )
}
