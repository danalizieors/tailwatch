import { Markdown } from '~/components/ui/markdown'
import { RelativeTime } from '~/components/ui/relative-time'
import { cn, getPathColor } from '~/lib/utils'
import { StatusBadge } from './status-badge'

interface StreamEntryRowProps {
  id: string
  time: string | number | Date
  status: string
  path: string
  content?: string | null
  isUnread: boolean
}

export function StreamEntryRow({
  id,
  time,
  status,
  path,
  content,
  isUnread,
}: StreamEntryRowProps) {
  const pathColor = getPathColor(path)

  const eventDate = new Date(time)
  const absoluteTime = Number.isFinite(eventDate.getTime())
    ? eventDate.toLocaleTimeString(undefined, {
        hour12: false,
        fractionalSecondDigits: 3,
      })
    : 'Unknown time'

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-2 border-l-4 px-4 py-3 pr-8 md:grid md:grid-cols-[150px_minmax(0,1fr)_100px] md:gap-4 md:px-6 md:py-2 md:pr-6',
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

      <div className='flex items-center justify-between gap-3'>
        <RelativeTime
          time={time}
          className='cursor-help self-center text-xs font-bold tracking-tighter whitespace-nowrap text-zinc-400 tabular-nums'
          title={absoluteTime}
        />

        <div className='flex items-center md:hidden'>
          <StatusBadge
            status={status}
            className={cn(
              'text-xxs rounded border px-1.5 py-0.5 leading-none font-semibold tracking-wide',
              entryStatusColors(status),
            )}
          />
        </div>
      </div>

      <div className='mt-0.5 w-full min-w-0 self-center md:mt-0 md:w-auto md:self-start'>
        <div className='mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 md:mb-0.5 md:overflow-hidden'>
          <span
            className='max-w-full min-w-0 truncate text-xs font-semibold tracking-wide'
            style={{ color: pathColor }}
          >
            {path}
          </span>
        </div>
        <Markdown
          key={`${id}-${content ?? 'empty_payload'}`}
          className='text-foreground inline-block text-xs leading-5 font-medium tracking-tight break-words'
          content={content ?? 'empty_payload'}
        />
      </div>

      <div className='hidden flex-col items-end justify-center overflow-hidden md:flex'>
        <StatusBadge
          status={status}
          className={cn(
            'text-xxs rounded border px-1.5 py-0.5 leading-none font-semibold tracking-wide',
            entryStatusColors(status),
          )}
        />
      </div>
    </div>
  )
}

function entryStatusColors(status: string) {
  switch (status) {
    case 'busy':
      return 'text-zinc-300 border-zinc-400/40 bg-zinc-500/10'
    case 'idle':
      return 'text-primary border-primary/40 bg-primary/10 shadow-primary-glow-sm'
    default:
      return 'text-zinc-400 border-white/10 bg-white/5'
  }
}
