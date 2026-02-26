import type { ReactNode } from 'react'
import { AlertCircle, Search, Filter, Hash, CheckCircle2 } from 'lucide-react'
import type { EventStatus, StoredEvent } from '~/lib/types'
import { cn, getPathColor } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Markdown } from '~/components/ui/markdown'

interface LogStreamProps {
  events: StoredEvent[]
  searchValue: string
  onSearchChange: (value: string) => void
  statusFilter: EventStatus | 'all'
  onStatusFilterChange: (value: EventStatus | 'all') => void
  lastSeenAt: number
  onAcknowledge?: () => void
  headerActions?: ReactNode
}

const EVENT_STATUSES: Array<EventStatus | 'all'> = ['all', 'busy', 'idle']

export function LogStream({ events, searchValue, onSearchChange, statusFilter, onStatusFilterChange, lastSeenAt, onAcknowledge, headerActions }: LogStreamProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="py-3 mb-4 flex flex-col gap-3 border-b border-border/20 shrink-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Hash className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-tight">Event Log</h2>
          <span className="text-[10px] font-bold text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded-md ml-1 border border-border/10">
            {events.length} ENTRIES
          </span>
        </div>
        
        <div className="flex flex-wrap items-center justify-start gap-2.5 sm:justify-end">
          {onAcknowledge && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 border-primary/20 bg-primary/5 hover:bg-primary/10 text-[9px] font-black uppercase tracking-widest text-primary gap-1.5 px-3 rounded-lg"
              onClick={onAcknowledge}
            >
              <CheckCircle2 className="h-3 w-3" />
              Acknowledge
            </Button>
          )}
          {headerActions}
          <div className="relative group flex-1 min-w-[11rem] sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
            <input
              className="h-8 w-full sm:w-40 lg:w-56 rounded-lg border border-border/40 bg-background/30 pl-8 pr-4 text-[11px] focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all placeholder:text-muted-foreground/50 font-bold uppercase tracking-tight"
              placeholder="Filter entries..."
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-border/40 bg-background/30 px-2.5 shadow-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />
            <select
              className="bg-transparent text-[10px] font-bold uppercase tracking-tight outline-none cursor-pointer text-foreground/70"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as EventStatus | 'all')}
            >
              {EVENT_STATUSES.map((value) => (
                <option key={value} value={value} className="bg-background text-foreground uppercase">
                  {value === 'all' ? 'All Statuses' : value}
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
          <div>Status</div>
          <div>Message</div>
          <div className="text-right">Path</div>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center flex-col gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5 opacity-40" />
              <span className="text-xs font-medium opacity-60 uppercase tracking-widest font-bold">Event log empty</span>
            </div>
          ) : (
            <div className="divide-y divide-white/5 font-mono text-xs">
              {events.map((event) => {
                const pathColor = getPathColor(event.path)
                const isBusy = event.status === 'busy'
                const isUnread = new Date(event.timestamp).getTime() > lastSeenAt
                const eventDate = new Date(event.timestamp)
                
                return (
                  <div 
                    key={event.id} 
                    className={cn(
                      "group relative flex flex-col gap-2 border-l-[4px] px-4 py-3 pr-8 md:grid md:grid-cols-[100px_80px_minmax(0,1fr)_100px] md:gap-4 md:px-6 md:py-2 md:pr-6",
                      isBusy ? "opacity-100" : "opacity-90",
                      isUnread && "bg-amber-500/[0.08]"
                    )}
                    style={{ 
                      borderLeftColor: pathColor,
                    }}
                  >
                    {isUnread && (
                      <div className="absolute right-3 top-3 z-10 md:right-4 md:top-1/2 md:-translate-y-1/2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,1)]"></span>
                        </span>
                      </div>
                    )}
                    {/* Meta Row (Timestamp & Level) */}
                    <div className="flex items-center justify-between gap-3 md:contents">
                      <div className="text-muted-foreground/50 text-[10px] tabular-nums whitespace-nowrap self-center font-medium">
                        <span className="md:hidden">
                          {eventDate.toLocaleTimeString(undefined, { hour12: false })}
                        </span>
                        <span className="hidden md:inline">
                          {eventDate.toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 })}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className={cn('font-black text-[8px] px-1.5 py-0.5 rounded border leading-none uppercase tracking-tighter', eventStatusColors(event.status))}>
                          {event.status}
                        </span>
                      </div>
                    </div>

                    {/* Content Row */}
                    <div className="mt-0.5 w-full min-w-0 self-center md:mt-0 md:w-auto">
                      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 md:mb-0.5 md:overflow-hidden">
                        <span 
                          className="min-w-0 max-w-full truncate text-[9px] font-black tracking-widest uppercase opacity-60"
                          style={{ color: pathColor }}
                        >
                          {event.path}
                        </span>
                        {event.entityId && (
                          <span className="shrink-0 text-[9px] font-bold opacity-30" style={{ color: pathColor }}>
                            @{event.entityId}
                          </span>
                        )}
                      </div>
                      <Markdown 
                        className={cn('break-words leading-5 text-[11px] tracking-tight text-foreground/90 font-medium', event.status === 'busy' && 'text-amber-200 font-bold')}
                        content={event.content ?? 'empty_payload'}
                      />
                    </div>

                    {/* Path (Desktop Only) */}
                    <div className="hidden md:flex flex-col items-end justify-center opacity-20 group-hover:opacity-100 overflow-hidden">
                      <span className="text-[9px] truncate font-medium max-w-[90px]">{event.path.split('/').slice(-1)[0]}</span>
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

function eventStatusColors(status: EventStatus) {
  switch (status) {
    case 'busy': return 'text-amber-300 border-amber-400/40 bg-amber-400/10'
    case 'idle': return 'text-info border-info/30 bg-info/10'
    default: return 'text-foreground/60 border-white/10 bg-white/5'
  }
}
