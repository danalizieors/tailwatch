import { AlertCircle } from 'lucide-react'
import type { EventStatus, StoredEvent } from '~/lib/types'
import { cn, getPathColor } from '~/lib/utils'
import { Markdown } from '~/components/ui/markdown'

interface LogStreamProps {
  events: StoredEvent[]
  lastSeenAt: number
}

export function LogStream({ events, lastSeenAt }: LogStreamProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 bg-card/10 border border-primary/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="scroll-thin flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center flex-col gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5 opacity-20" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Event log empty</span>
            </div>
          ) : (
            <div className="divide-y divide-white/5 font-mono text-xs">
              {events.map((event) => {
                const pathColor = getPathColor(event.path)
                const pathColorDim = `oklch(from ${pathColor} 0.65 0.05 h)`
                const isBusy = event.status === 'busy'
                const isUnread = new Date(event.time).getTime() > lastSeenAt
                const eventDate = new Date(event.time)
                
                return (
                  <div 
                    key={event.id} 
                    className={cn(
                      "group relative flex flex-col gap-2 border-l-4 px-4 py-3 pr-8 md:grid md:grid-cols-[100px_80px_minmax(0,1fr)_100px] md:gap-4 md:px-6 md:py-2 md:pr-6",
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
                      <div className="text-zinc-400 text-xs tabular-nums whitespace-nowrap self-center font-bold tracking-tighter">
                        <span className="md:hidden">
                          {eventDate.toLocaleTimeString(undefined, { hour12: false })}
                        </span>
                        <span className="hidden md:inline">
                          {eventDate.toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 })}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className={cn('font-black text-[0.625rem] px-1.5 py-0.5 rounded border leading-none uppercase tracking-widest', eventStatusColors(event.status))}>
                          {event.status}
                        </span>
                      </div>
                    </div>

                    {/* Content Row */}
                    <div className="mt-0.5 w-full min-w-0 self-center md:mt-0 md:w-auto">
                      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 md:mb-0.5 md:overflow-hidden">
                        <span 
                          className="min-w-0 max-w-full truncate text-xs font-black tracking-widest uppercase"
                          style={{ color: pathColor }}
                        >
                          {event.path}
                        </span>
                        {event.entityId && (
                          <span className="shrink-0 text-xs font-black tracking-widest uppercase" style={{ color: pathColorDim }}>
                            @{event.entityId}
                          </span>
                        )}
                      </div>
                      <Markdown 
                        className={cn('break-words leading-5 text-xs tracking-tight text-foreground font-medium', event.status === 'busy' && 'text-amber-200 font-bold')}
                        content={event.content ?? 'empty_payload'}
                      />
                    </div>

                    {/* Path (Desktop Only) */}
                    <div className="hidden md:flex flex-col items-end justify-center overflow-hidden">
                      <span className="text-xs truncate font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400 max-w-[90px] transition-colors">{event.path.split('/').slice(-1)[0]}</span>
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
    default: return 'text-zinc-400 border-white/10 bg-white/5'
  }
}
