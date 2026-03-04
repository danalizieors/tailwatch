import { AlertCircle } from 'lucide-react'
import type { StoredEvent } from '~/lib/types'
import { StreamEntryRow } from './stream-entry-row'

interface LogStreamProps {
  events: StoredEvent[]
  lastSeenAt: number
}

export function LogStream({ events, lastSeenAt }: LogStreamProps) {
  const entryLabel = events.length === 1 ? 'entry' : 'entries'

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-md transition-all'>
        <div className='border-border/30 bg-background/30 flex items-center justify-between border-b px-3 py-2'>
          <p className='text-xs font-semibold tracking-wide text-zinc-300'>
            Events
          </p>
          <span className='text-xxs border-border/40 bg-card/50 rounded-full border px-2 py-1 font-semibold tracking-wide text-zinc-400'>
            {events.length} {entryLabel}
          </span>
        </div>

        <div className='scroll-thin flex-1 overflow-y-auto'>
          {events.length === 0 ? (
            <div className='text-muted-foreground flex h-full min-h-[300px] flex-col items-center justify-center gap-2'>
              <AlertCircle className='h-5 w-5 opacity-20' />
            </div>
          ) : (
            <div className='divide-y divide-white/5 font-mono text-xs'>
              {events.map((event) => {
                const isUnread = new Date(event.time).getTime() > lastSeenAt

                return (
                  <StreamEntryRow
                    key={event.id}
                    id={event.id}
                    time={event.time}
                    status={event.status}
                    path={event.path}
                    content={event.content}
                    isUnread={isUnread}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
