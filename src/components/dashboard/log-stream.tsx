import { AlertCircle, Clock3, Search, TerminalSquare, Filter } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import type { EventType, StoredEvent } from '~/lib/types'
import { formatDateTime } from '~/lib/format'
import { cn, getPathColor } from '~/lib/utils'

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
    <Card className="flex flex-col flex-1 border-border/40 bg-card/40 backdrop-blur shadow-sm card-hover-effect overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/20 bg-background/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TerminalSquare className="h-5 w-5 text-primary" />
            <CardTitle className="font-mono text-lg tracking-tight uppercase tracking-widest">System.LogStream</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/20">
            {events.length} RECORDED_EVENTS
          </Badge>
        </div>
      </CardHeader>
      
      <div className="flex flex-col flex-1 min-h-0">
        {/* Controls Bar */}
        <div className="flex flex-wrap gap-3 items-center px-4 py-3 border-b border-border/20 bg-background/20">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              className="h-9 w-full rounded-md border border-border/50 bg-background/50 pl-9 pr-4 text-xs font-mono shadow-sm outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
              placeholder="QUERY CONTENT, RUN, ENTITY..."
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-md px-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              className="h-8 bg-transparent text-[11px] font-mono outline-none cursor-pointer uppercase text-foreground/80"
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
        </div>

        {/* Table Head */}
        <div className="grid grid-cols-[120px_100px_minmax(0,1fr)_120px] gap-4 px-6 py-2 border-b border-border/20 bg-muted/30 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
          <div>Timestamp</div>
          <div>Level/Type</div>
          <div>Message</div>
          <div className="text-right">Origin</div>
        </div>

        {/* Table Body */}
        <div className="scroll-thin flex-1 overflow-y-auto bg-background/10">
          {events.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center flex-col gap-3 text-sm text-muted-foreground font-mono">
              <AlertCircle className="h-6 w-6 opacity-30 animate-pulse" />
              <span className="opacity-50 uppercase tracking-widest text-xs">Waiting for events...</span>
            </div>
          ) : (
            <div className="divide-y divide-border/10 font-mono text-[12px]">
              {events.map((event) => {
                const pathColor = getPathColor(event.path)
                const isInProgress = event.type === 'start' || event.type === 'heartbeat'
                
                return (
                  <div 
                    key={event.id} 
                    className={cn(
                      "group grid grid-cols-[120px_100px_minmax(0,1fr)_120px] gap-4 px-6 py-3 hover:bg-primary/5 transition-all border-l-2",
                      isInProgress ? "opacity-60 grayscale-[0.3]" : "opacity-100"
                    )}
                    style={{ borderLeftColor: pathColor }}
                  >
                    {/* Timestamp */}
                    <div className="text-muted-foreground/70 tabular-nums whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 })}
                    </div>

                    {/* Level/Type */}
                    <div className="flex items-start">
                      <span className={cn('font-bold text-[10px] px-1.5 py-0.5 rounded border leading-none', eventTypeColors(event.type))}>
                        {event.type.toUpperCase()}
                      </span>
                    </div>

                    {/* Message */}
                    <div className="min-w-0">
                      <div 
                        className="text-[10px] mb-0.5 truncate uppercase tracking-tighter transition-opacity font-bold"
                        style={{ color: pathColor }}
                      >
                        {event.path}
                      </div>
                      <p className={cn('break-words leading-tight', event.type === 'error' ? 'text-red-400' : 'text-foreground/90')}>
                        {event.content ?? <span className="text-muted-foreground/20 italic">{"<null>"}</span>}
                      </p>
                    </div>

                    {/* Origin */}
                    <div className="flex flex-col items-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity overflow-hidden">
                      {event.entityId && (
                        <span className="text-[10px] text-sky-400/80 truncate max-w-full">
                          @{event.entityId}
                        </span>
                      )}
                      {event.runId && (
                        <span className="text-[9px] text-muted-foreground/60">
                          {event.runId.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function eventTypeColors(type: EventType) {
  switch (type) {
    case 'start': return 'text-muted-foreground border-border/40 bg-muted/5'
    case 'stop': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
    case 'error': return 'text-red-400 border-red-500/20 bg-red-500/5'
    case 'heartbeat': return 'text-muted-foreground border-border/40 bg-muted/5'
    case 'status': return 'text-sky-400 border-sky-500/20 bg-sky-500/5'
    default: return 'text-foreground border-border/40'
  }
}
