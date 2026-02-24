import { useDeferredValue, useState } from 'react'
import { RefreshCw, Activity } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { formatRelative } from '~/lib/format'
import type { EventType } from '~/lib/types'
import { LogStream } from './log-stream'
import { PublishPanel } from './publish-panel'
import { StatCards } from './stat-cards'
import { StatusBoard } from './status-board'
import { TopicTreePanel } from './topic-tree'
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === 'logs' ? 'Event Stream Dashboard' : 'Status Board Dashboard'}
            </h1>
            {data && <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? (
              <span className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-emerald-500" />
                Updated {formatRelative(data.fetchedAt)}
              </span>
            ) : (
              'Initializing real-time connection...'
            )}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refresh} 
          disabled={isRefreshing}
          className="border-border/60 bg-background/50 backdrop-blur hover:bg-muted"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          {isRefreshing ? 'Syncing...' : 'Sync'}
        </Button>
      </div>

      {error && (
        <Card className="border-red-900/50 bg-red-950/20 text-red-400 backdrop-blur">
          <CardContent className="p-4 text-sm font-mono">{error}</CardContent>
        </Card>
      )}

      {isLoading && !data ? (
        <Card className="border-border/50 bg-background/40 backdrop-blur shadow-sm">
          <CardContent className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-primary/70" />
              Loading dimensional data...
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <StatCards stats={data.stats} />
          <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-6">
              <TopicTreePanel tree={data.topicTree} selectedTopic={selectedTopic} onSelectTopic={setSelectedTopic} />
              {mode === 'logs' ? <PublishPanel onPublished={refresh} /> : null}
            </div>
            <div className="min-w-0 h-full">
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
          </div>
        </div>
      ) : null}
    </div>
  )
}
