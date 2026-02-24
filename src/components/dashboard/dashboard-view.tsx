import { useDeferredValue, useState } from 'react'
import { RefreshCw } from 'lucide-react'
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/60 bg-white/70 p-3 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold">
            {mode === 'logs' ? 'Event Stream Dashboard' : 'Status Board Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data ? `Updated ${formatRelative(data.fetchedAt)}` : 'Loading dashboard data...'}
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50/80 text-red-800">
          <CardContent className="p-4 text-sm">{error}</CardContent>
        </Card>
      )}

      {isLoading && !data ? (
        <Card className="border-white/70 bg-white/80">
          <CardContent className="p-6 text-sm text-muted-foreground">Loading dashboard…</CardContent>
        </Card>
      ) : null}

      {data ? (
        <>
          <StatCards stats={data.stats} />
          <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-4">
              <TopicTreePanel tree={data.topicTree} selectedTopic={selectedTopic} onSelectTopic={setSelectedTopic} />
              {mode === 'logs' ? <PublishPanel onPublished={refresh} /> : null}
            </div>
            <div>
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
        </>
      ) : null}
    </div>
  )
}
