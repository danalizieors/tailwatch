import { AlertCircle, Search, Filter, Hash } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import type { EventType, StoredEvent } from '~/lib/types'
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
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Hash className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-tight">Event Log</h2>
          <span className="text-[10px] font-bold text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded-md ml-1 border border-border/10">
            {events.length} ENTRIES
          </span>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
            <input
              className="h-8 w-40 lg:w-56 rounded-lg border border-border/40 bg-background/30 pl-8 pr-4 text-[11px] focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all placeholder:text-muted-foreground/50 font-bold uppercase tracking-tight"
              placeholder="Filter entries..."
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-background/30 border border-border/40 rounded-lg px-2.5 shadow-xs h-8">
            <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />
            <select
              className="bg-transparent text-[10px] font-bold uppercase tracking-tight outline-none cursor-pointer text-foreground/70"
              value={typeFilter}
              onChange={(event) => onTypeFilterChange(event.target.value as EventType | 'all')}
            >
              {EVENT_TYPES.map((value) => (
                <option key={value} value={value} className="bg-background text-foreground uppercase">
                  {value === 'all' ? 'All Types' : value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col flex-1 min-h-0 bg-card/10 border border-primary/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="grid grid-cols-[110px_90px_minmax(0,1fr)_120px] gap-4 px-6 py-4 bg-primary/5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80">
          <div>Timestamp</div>
          <div>Level</div>
          <div>Message</div>
          <div className="text-right">Entity</div>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center flex-col gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5 opacity-40" />
              <span className="text-xs font-medium opacity-60">Empty dataset</span>
            </div>
          ) : (
            <div className="divide-y divide-border/10 font-sans text-xs">
              {events.map((event) => {
                const pathColor = getPathColor(event.path)
                const isInProgress = event.type === 'start' || event.type === 'heartbeat'
                
                return (
                  <div 
                    key={event.id} 
                    className={cn(
                      "group grid grid-cols-[110px_90px_minmax(0,1fr)_120px] gap-4 px-6 py-5 border-l-[6px]",
                      isInProgress ? "opacity-75" : "opacity-100"
                    )}
                    style={{ 
                      borderLeftColor: pathColor,
                      backgroundColor: `oklch(from ${pathColor} 0.18 0.08 h / 0.25)`
                    }}
                  >
                    <div className="text-muted-foreground/80 font-mono text-[11px] tabular-nums whitespace-nowrap self-center font-bold">
                      {new Date(event.timestamp).toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 })}
                    </div>

                    <div className="flex items-center">
                      <span className={cn('font-black text-[10px] px-3 py-1.5 rounded-lg border-2 leading-none uppercase tracking-widest shadow-sm', eventTypeColors(event.type))}>
                        {event.type}
                      </span>
                    </div>

                    <div className="min-w-0 self-center">
                      <div 
                        className="text-[11px] mb-1.5 truncate group-hover:opacity-100 font-mono font-black tracking-widest uppercase"
                        style={{ color: pathColor }}
                      >
                        {event.path}
                      </div>
                      <p className={cn('break-words leading-relaxed text-foreground font-bold text-sm tracking-tight', event.type === 'error' && 'text-destructive')}>
                        {event.content ?? <span className="text-white/20 italic font-medium">No payload content</span>}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-center gap-1 opacity-50 group-hover:opacity-100 overflow-hidden">
                      {event.entityId && (
                        <span className="text-[11px] font-mono font-black truncate max-w-full" style={{ color: pathColor }}>
                          @{event.entityId}
                        </span>
                      )}
                      {event.runId && (
                        <span className="text-[9px] font-mono text-muted-foreground/60 truncate">
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
    </div>
  )
}

function eventTypeColors(type: EventType) {
  switch (type) {
    case 'start': return 'text-muted-foreground border-border bg-muted/5'
    case 'stop': return 'text-success border-success/30 bg-success/10'
    case 'error': return 'text-destructive border-destructive/30 bg-destructive/10'
    case 'heartbeat': return 'text-muted-foreground border-border bg-muted/5'
    case 'status': return 'text-info border-info/30 bg-info/10'
    default: return 'text-foreground border-border bg-muted/5'
  }
}
