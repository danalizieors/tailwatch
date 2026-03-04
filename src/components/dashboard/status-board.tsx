import { AlertCircle } from 'lucide-react'
import { toTimestamp } from '~/lib/format'
import type { EntitySnapshot } from '~/lib/types'
import { StreamEntryRow } from './stream-entry-row'

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
      <div className='scroll-thin flex-1 overflow-y-auto'>
        {rows.length === 0 ? (
          <div className='text-muted-foreground flex h-full min-h-[300px] flex-col items-center justify-center gap-2'>
            <AlertCircle className='h-5 w-5 opacity-20' />
          </div>
        ) : (
          <div className='space-y-4 font-mono text-xs'>
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
      data-tone={tone}
      className='overflow-hidden rounded-xl border border-white/10 bg-zinc-900/30'
    >
      <div className='border-border/30 bg-background/30 flex items-center justify-between border-b px-3 py-2'>
        <p className='text-xs font-semibold tracking-wide text-zinc-300'>
          {title}
        </p>
        <span className='text-xxs border-border/40 bg-card/50 rounded-full border px-2 py-1 font-semibold tracking-wide text-zinc-400'>
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className='divide-y divide-white/5'>
        {rows.map((row) => {
          const rowLastSeenTs = toTimestamp(row.lastSeenAt)
          const isUnread = rowLastSeenTs !== null && rowLastSeenTs > lastSeenAt

          return (
            <StreamEntryRow
              key={row.key}
              id={row.key}
              time={rowLastSeenTs ?? row.lastSeenAt}
              status={row.currentStatus}
              path={row.path}
              content={row.lastContent}
              isUnread={isUnread}
            />
          )
        })}
      </div>
    </section>
  )
}
