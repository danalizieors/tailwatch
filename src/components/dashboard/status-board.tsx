import { AlertCircle } from 'lucide-react'
import { Markdown } from '~/components/ui/markdown'
import { RelativeTime } from '~/components/ui/relative-time'
import { toTimestamp } from '~/lib/format'
import type { EntitySnapshot } from '~/lib/types'
import { cn, getPathColor } from '~/lib/utils'

interface StatusBoardProps {
  rows: EntitySnapshot[]
  lastSeenAt: number
}

export function StatusBoard({ rows, lastSeenAt }: StatusBoardProps) {
  const sortedRows = [...rows].sort((a, b) => {
    const aTs = toTimestamp(a.lastSeenAt) ?? 0
    const bTs = toTimestamp(b.lastSeenAt) ?? 0
    return bTs - aTs
  })

  const busyRows = sortedRows.filter((row) => row.currentStatus === 'busy')
  const idleRows = sortedRows.filter((row) => row.currentStatus === 'idle')

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='bg-zinc-900/40 border-white/5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border backdrop-blur-md transition-all'>
        <div className='scroll-thin flex-1 overflow-y-auto'>
          {rows.length === 0 ? (
            <div className='text-muted-foreground flex h-full min-h-[300px] flex-col items-center justify-center gap-2'>
              <AlertCircle className='h-5 w-5 opacity-20' />
            </div>
          ) : (
            <div className='space-y-4 p-2 font-mono text-xs md:p-3'>
              <StatusSection
                title='Idle'
                tone='idle'
                rows={idleRows}
                lastSeenAt={lastSeenAt}
              />
              <StatusSection
                title='Busy'
                tone='busy'
                rows={busyRows}
                lastSeenAt={lastSeenAt}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type StatusSectionTone = 'busy' | 'idle'

interface StatusSectionProps {
  title: string
  tone: StatusSectionTone
  rows: EntitySnapshot[]
  lastSeenAt: number
}

function StatusSection({ title, tone, rows, lastSeenAt }: StatusSectionProps) {
  if (rows.length === 0) return null

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border',
        tone === 'busy'
          ? 'border-amber-400/20 bg-amber-500/5'
          : 'border-info/20 bg-info/5',
      )}
    >
      <div className='border-border/30 bg-background/30 flex items-center justify-between border-b px-3 py-2'>
        <p
          className={cn(
            'text-xs font-semibold tracking-wide',
            tone === 'busy' ? 'text-amber-300' : 'text-info',
          )}
        >
          {title}
        </p>
        <span className='text-xxs border-border/40 bg-card/50 rounded-full border px-2 py-1 font-semibold tracking-wide text-zinc-400'>
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className='divide-y divide-white/5'>
        {rows.map((row) => {
          const pathColor = getPathColor(row.path)
          const pathColorDim = `oklch(from ${pathColor} 0.65 0.05 h)`
          const rowLastSeenTs = toTimestamp(row.lastSeenAt)
          const isUnread = rowLastSeenTs !== null && rowLastSeenTs > lastSeenAt
          const absoluteTime =
            rowLastSeenTs === null
              ? 'Unknown time'
              : new Date(rowLastSeenTs).toLocaleTimeString(undefined, {
                  hour12: false,
                  fractionalSecondDigits: 3,
                })

          return (
            <div
              key={row.key}
              className={cn(
                'group relative flex flex-col gap-2 border-l-4 px-4 py-3 pr-8 transition-colors md:grid md:grid-cols-[100px_80px_minmax(0,1fr)_100px] md:gap-4 md:px-6 md:py-2 md:pr-6',
                tone === 'busy' ? 'hover:bg-amber-500/5' : 'hover:bg-info/5',
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

              <div className='flex items-center justify-between gap-3 md:contents'>
                <RelativeTime
                  time={rowLastSeenTs ?? row.lastSeenAt}
                  className='cursor-help self-center text-xs font-bold tracking-tighter whitespace-nowrap text-zinc-400 tabular-nums'
                  title={absoluteTime}
                />

                <div className='flex items-center'>
                  <span
                    key={`${row.key}-${row.currentStatus}`}
                    className={cn(
                      'text-xxs animate-glow rounded border px-1.5 py-0.5 leading-none font-semibold tracking-wide',
                      statusBadgeColors(row.currentStatus),
                    )}
                  >
                    {row.currentStatus}
                  </span>
                </div>
              </div>

              <div className='mt-0.5 w-full min-w-0 self-center md:mt-0 md:w-auto'>
                <div className='mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 md:mb-0.5 md:overflow-hidden'>
                  <span
                    className='max-w-full min-w-0 truncate text-xs font-semibold tracking-wide'
                    style={{ color: pathColor }}
                  >
                    {row.path}
                  </span>
                  {row.entityId && (
                    <span
                      className='shrink-0 text-xs font-semibold tracking-wide'
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
                    row.currentStatus === 'busy' && 'font-bold text-amber-200',
                  )}
                  content={row.lastContent ?? 'empty_payload'}
                />
              </div>

              <div className='hidden flex-col items-end justify-center overflow-hidden md:flex'>
                <span className='max-w-[90px] truncate text-xs font-medium tracking-wide text-zinc-500 transition-colors group-hover:text-zinc-400'>
                  {row.path.split('/').slice(-1)[0]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
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
