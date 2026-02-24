import { AlertCircle, Clock3, Search } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import type { EventType, StoredEvent } from '~/lib/types'
import { formatDateTime } from '~/lib/format'
import { cn } from '~/lib/utils'

interface LogStreamProps {
  events: StoredEvent[]
  searchValue: string
  onSearchChange: (value: string) => void
  typeFilter: EventType | 'all'
  onTypeFilterChange: (value: EventType | 'all') => void
}

const EVENT_TYPES: Array<EventType | 'all'> = ['all', 'start', 'log', 'stop', 'error', 'heartbeat', 'status']

export function LogStream({ events, searchValue, onSearchChange, typeFilter, onTypeFilterChange }: LogStreamProps) {
  return (
    <Card className="border-white/70 bg-white/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle>Log Stream</CardTitle>
        <CardDescription>Live chronological events across the selected topic namespace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-2 rounded-md border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="h-9 w-full border-0 bg-transparent text-sm outline-none"
              placeholder="Search content, run, entity, path..."
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value as EventType | 'all')}
          >
            {EVENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'All types' : value}
              </option>
            ))}
          </select>
        </div>

        <div className="scroll-thin max-h-[42rem] overflow-auto rounded-lg border bg-background/80">
          {events.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No events match the current filters.
            </div>
          ) : (
            <ul className="divide-y">
              {events.map((event) => (
                <li key={event.id} className="grid gap-2 px-4 py-3 md:grid-cols-[auto_auto_1fr] md:items-start">
                  <div className="flex items-center gap-2">
                    <Badge variant={eventTypeBadge(event.type)}>{event.type}</Badge>
                    {event.level && <Badge variant={event.level === 'error' ? 'destructive' : 'secondary'}>{event.level}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {formatDateTime(event.timestamp)}
                    </div>
                    <div className="mt-1 font-mono">{event.path}</div>
                  </div>
                  <div className="space-y-1">
                    <p className={cn('text-sm', event.type === 'error' && 'text-red-700')}>
                      {event.content ?? '(no content)'}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {event.entityId && <span>entity: {event.entityId}</span>}
                      {event.entityType && <span>kind: {event.entityType}</span>}
                      {event.runId && <span>run: {event.runId}</span>}
                      {event.status && <span>status: {event.status}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function eventTypeBadge(type: EventType) {
  switch (type) {
    case 'start':
      return 'success' as const
    case 'stop':
      return 'secondary' as const
    case 'error':
      return 'destructive' as const
    case 'heartbeat':
      return 'warning' as const
    default:
      return 'outline' as const
  }
}
