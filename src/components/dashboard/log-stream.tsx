import { AlertCircle, Clock3, Search, TerminalSquare } from 'lucide-react'
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
    <Card className="flex flex-col h-full border-border/40 bg-card/40 backdrop-blur shadow-sm card-hover-effect">
      <CardHeader className="pb-4 border-b border-border/20 bg-background/20">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-5 w-5 text-primary" />
          <CardTitle className="font-mono text-lg tracking-tight">System.LogStream</CardTitle>
        </div>
        <CardDescription className="text-xs">Live chronological events across the selected namespace.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4 p-4 min-h-0">
        <div className="flex gap-3 items-center w-full">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              className="h-10 w-full rounded-md border border-border/50 bg-background/50 pl-10 pr-4 text-sm font-mono shadow-sm outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/60"
              placeholder="Search content, run, entity, path..."
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm font-mono shadow-sm outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/50 hover:bg-background/80 cursor-pointer"
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value as EventType | 'all')}
          >
            {EVENT_TYPES.map((value) => (
              <option key={value} value={value} className="bg-background">
                {value === 'all' ? '*.*' : value}
              </option>
            ))}
          </select>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto rounded-lg border border-border/40 bg-background/30 shadow-inner">
          {events.length === 0 ? (
            <div className="flex h-full min-h-[20rem] items-center justify-center gap-2 text-sm text-muted-foreground font-mono">
              <AlertCircle className="h-4 w-4 opacity-50" />
              <span className="opacity-70">No events matched query.</span>
            </div>
          ) : (
            <ul className="divide-y divide-border/20 font-mono text-[13px]">
              {events.map((event) => (
                <li key={event.id} className="group relative grid gap-x-4 gap-y-1 p-3 hover:bg-white/5 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                  {/* Left Column: Timestamp & Level */}
                  <div className="flex flex-col gap-1 sm:w-32 opacity-80">
                    <span className="text-muted-foreground whitespace-nowrap tabular-nums">
                      {new Date(event.timestamp).toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 })}
                    </span>
                  </div>

                  {/* Middle Column: Path & Content */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('font-semibold truncate', eventTypeColor(event.type))}>
                        [{event.type.toUpperCase()}]
                      </span>
                      <span className="truncate text-muted-foreground/80">{event.path}</span>
                    </div>
                    <p className={cn('break-words', event.type === 'error' ? 'text-red-400' : 'text-foreground/90')}>
                      {event.content ?? <span className="text-muted-foreground/40 italic">{"<no content>"}</span>}
                    </p>
                  </div>

                  {/* Right Column: Metadata Badges */}
                  <div className="flex flex-wrap sm:flex-col sm:items-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity mt-2 sm:mt-0">
                    {event.entityId && (
                      <span className="inline-flex items-center rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                        {event.entityId}
                      </span>
                    )}
                    {event.runId && (
                      <span className="inline-flex items-center rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        run:{event.runId.slice(0, 8)}
                      </span>
                    )}
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

function eventTypeColor(type: EventType) {
  switch (type) {
    case 'start': return 'text-emerald-400'
    case 'stop': return 'text-muted-foreground'
    case 'error': return 'text-red-400'
    case 'heartbeat': return 'text-sky-400'
    case 'status': return 'text-primary'
    default: return 'text-foreground'
  }
}
