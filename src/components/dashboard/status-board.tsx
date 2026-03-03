import { AlertCircle } from 'lucide-react'
import { Markdown } from '~/components/ui/markdown'
import { RelativeTime } from '~/components/ui/relative-time'
import type { EntitySnapshot } from '~/lib/types'
import { cn, getPathColor } from '~/lib/utils'

interface StatusBoardProps {
  rows: EntitySnapshot[]
  lastSeenAt: number
}

export function StatusBoard({ rows, lastSeenAt }: StatusBoardProps) {
  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='bg-card/10 border-primary/10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border backdrop-blur-md'>
        <div className='scroll-thin flex-1 overflow-y-auto'>
          {rows.length === 0 ? (
            <div className='text-muted-foreground flex h-full min-h-[300px] flex-col items-center justify-center gap-2'>
              <AlertCircle className='h-5 w-5 opacity-20' />
            </div>
          ) : (
            <div className='divide-y divide-white/5 font-mono text-xs'>
              {rows.map((row) => {
                const pathColor = getPathColor(row.path)
                const pathColorDim = `oklch(from ${pathColor} 0.65 0.05 h)`
                const isBusy = row.currentStatus === 'busy'
                const isUnread = new Date(row.lastSeenAt).getTime() > lastSeenAt
                const lastSeenDate = new Date(row.lastSeenAt)
                const absoluteTime = lastSeenDate.toLocaleTimeString(
                  undefined,
                  {
                    hour12: false,
                    fractionalSecondDigits: 3,
                  },
                )

                return (
                  <div
                    key={row.key}
                    className={cn(
                      'group relative flex flex-col gap-2 border-l-4 px-4 py-3 pr-8 md:grid md:grid-cols-[100px_80px_minmax(0,1fr)_100px] md:gap-4 md:px-6 md:py-2 md:pr-6',
                      isBusy ? 'opacity-100' : 'opacity-90',
                      isUnread && 'bg-amber-500/10',
                    )}
                    style={{
                      borderLeftColor: pathColor,
                    }}
                  >
                    {isUnread && (
                      <div className='absolute top-3 right-3 z-10 md:top-1/2 md:right-4 md:-translate-y-1/2'>
                        <span className='relative flex h-2 w-2'>
                          <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75'></span>
                          <span className='shadow-primary-glow-sm relative inline-flex h-2 w-2 rounded-full bg-amber-500'></span>
                        </span>
                      </div>
                    )}

                    {/* Meta Row (Timestamp & Status) */}
                    <div className='flex items-center justify-between gap-3 md:contents'>
                      <RelativeTime
                        time={row.lastSeenAt}
                        className='cursor-help self-center text-xs font-bold tracking-tighter whitespace-nowrap text-zinc-400 tabular-nums'
                        title={absoluteTime}
                      />

                      <div className='flex items-center'>
                        <span
                          key={`${row.key}-${row.currentStatus}`}
                          className={cn(
                            'text-xxs animate-glow rounded border px-1.5 py-0.5 leading-none font-black tracking-widest uppercase',
                            statusBadgeColors(row.currentStatus),
                          )}
                        >
                          {row.currentStatus}
                        </span>
                      </div>
                    </div>

                    {/* Content Row */}
                    <div className='mt-0.5 w-full min-w-0 self-center md:mt-0 md:w-auto'>
                      <div className='mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 md:mb-0.5 md:overflow-hidden'>
                        <span
                          className='max-w-full min-w-0 truncate text-xs font-black tracking-widest uppercase'
                          style={{ color: pathColor }}
                        >
                          {row.path}
                        </span>
                        {row.entityId && (
                          <span
                            className='shrink-0 text-xs font-black tracking-widest uppercase'
                            style={{
                              color: pathColorDim,
                            }}
                          >
                            @{row.entityId}
                          </span>
                        )}
                      </div>
                      <Markdown
                        key={`${row.key}-${row.lastContent}`}
                        className={cn(
                          'text-foreground animate-glow inline-block text-xs leading-5 font-medium tracking-tight break-words',
                          row.currentStatus === 'busy' &&
                            'font-bold text-amber-200',
                        )}
                        content={row.lastContent ?? 'empty_payload'}
                      />
                    </div>

                    {/* Path Tail (Desktop Only) */}
                    <div className='hidden flex-col items-end justify-center overflow-hidden md:flex'>
                      <span className='max-w-[90px] truncate text-xs font-black tracking-widest text-zinc-500 uppercase transition-colors group-hover:text-zinc-400'>
                        {row.path.split('/').slice(-1)[0]}
                      </span>
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

function statusBadgeColors(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'busy':
      return 'text-amber-300 border-amber-400/40 bg-amber-400/10'
    case 'idle':
      return 'text-info border-info/30 bg-info/10'
    default:
      return 'text-zinc-400 border-white/10 bg-white/5'
  }
}
