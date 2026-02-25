import { AlertCircle, Search, Filter, Hash, CheckCircle2 } from 'lucide-react'
import type { EventType, StoredEvent } from '~/lib/types'
import { cn, getPathColor } from '~/lib/utils'
import { Button } from '~/components/ui/button'

interface LogStreamProps {
  events: StoredEvent[]
  searchValue: string
  onSearchChange: (value: string) => void
  typeFilter: EventType | 'all'
  onTypeFilterChange: (value: EventType | 'all') => void
  lastSeenAt: number
  onAcknowledge?: () => void
}

const EVENT_TYPES: Array<EventType | 'all'> = ['all', 'start', 'log', 'stop', 'error', 'heartbeat', 'status']

export function LogStream({ events, searchValue, onSearchChange, typeFilter, onTypeFilterChange, lastSeenAt, onAcknowledge }: LogStreamProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
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
          {onAcknowledge && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 border-primary/20 bg-primary/5 hover:bg-primary/10 text-[9px] font-black uppercase tracking-widest text-primary gap-1.5 px-3 rounded-lg mr-2"
              onClick={onAcknowledge}
            >
              <CheckCircle2 className="h-3 w-3" />
              Acknowledge
            </Button>
          )}
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
        {/* Table Header - Desktop Only */}
        <div className="hidden md:grid grid-cols-[100px_80px_minmax(0,1fr)_100px] gap-4 px-6 py-2.5 bg-primary/5 text-[9px] uppercase font-black tracking-[0.2em] text-muted-foreground/60 border-b border-white/5">
          <div>Timestamp</div>
          <div>Level</div>
          <div>Message</div>
          <div className="text-right">Run ID</div>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center flex-col gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5 opacity-40" />
              <span className="text-xs font-medium opacity-60 uppercase tracking-widest font-bold">Registry empty</span>
            </div>
          ) : (
            <div className="divide-y divide-white/5 font-mono text-xs">
              {events.map((event) => {
                const pathColor = getPathColor(event.path)
                const isInProgress = event.type === 'start' || event.type === 'heartbeat'
                const isUnread = new Date(event.timestamp).getTime() > lastSeenAt
                
                return (
                  <div 
                    key={event.id} 
                    className={cn(
                      "group flex flex-col md:grid md:grid-cols-[100px_80px_minmax(0,1fr)_100px] gap-1 md:gap-4 px-4 md:px-6 py-3 md:py-2 border-l-[4px] relative",
                      isInProgress ? "opacity-60" : "opacity-100",
                      isUnread && "bg-amber-500/[0.08]"
                    )}
                    style={{ 
                      borderLeftColor: pathColor,
                    }}
                  >
                    {isUnread && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,1)]"></span>
                        </span>
                      </div>
                    )}
                    {/* Meta Row (Timestamp & Level) */}
                    <div className="flex items-center justify-between md:contents">
                      <div className="text-muted-foreground/50 text-[10px] tabular-nums whitespace-nowrap self-center font-medium">
                        {new Date(event.timestamp).toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 })}
                      </div>

                      <div className="flex items-center">
                        <span className={cn('font-black text-[8px] px-1.5 py-0.5 rounded border leading-none uppercase tracking-tighter', eventTypeColors(event.type))}>
                          {event.type}
                        </span>
                      </div>
                    </div>

                    {/* Content Row */}
                    <div className="min-w-0 self-center w-full md:w-auto mt-0.5 md:mt-0">
                      <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
                        <span 
                          className="text-[9px] truncate font-black tracking-widest uppercase opacity-60"
                          style={{ color: pathColor }}
                        >
                          {event.path}
                        </span>
                        {event.entityId && (
                          <span className="text-[9px] font-bold opacity-30 shrink-0" style={{ color: pathColor }}>
                            @{event.entityId}
                          </span>
                        )}
                      </div>
                      <p className={cn('break-words leading-tight text-foreground/90 font-medium text-[11px] tracking-tight', event.type === 'error' && 'text-destructive font-bold')}>
                        {event.content ?? <span className="text-white/10 italic font-normal">empty_payload</span>}
                      </p>
                    </div>

                    {/* Run ID (Desktop Only) */}
                    <div className="hidden md:flex flex-col items-end justify-center opacity-20 group-hover:opacity-100 overflow-hidden">
                      {event.runId && (
                        <span className="text-[9px] truncate font-medium">
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
    case 'start': return 'text-muted-foreground/60 border-white/10 bg-white/5'
    case 'stop': return 'text-success border-success/30 bg-success/10'
    case 'error': return 'text-destructive border-destructive/30 bg-destructive/10'
    case 'heartbeat': return 'text-muted-foreground/60 border-white/10 bg-white/5'
    case 'status': return 'text-info border-info/30 bg-info/10'
    default: return 'text-foreground/60 border-white/10 bg-white/5'
  }
}
