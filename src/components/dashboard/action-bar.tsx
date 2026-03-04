import { CheckCircle2, Filter, Search } from 'lucide-react'
import { Button } from '~/components/ui/button'
import type { DashboardStats, EventStatus } from '~/lib/types'
import { StatCards } from './stat-cards'

interface ActionBarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: EventStatus | 'all'
  onStatusFilterChange: (value: EventStatus | 'all') => void
  onAcknowledgeAll: () => void
  itemCount: number
  mode: 'logs' | 'status'
  stats?: DashboardStats
}

const EVENT_STATUS_OPTIONS: Array<EventStatus | 'all'> = ['all', 'busy', 'idle']

export function ActionBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAcknowledgeAll,
  itemCount,
  mode,
  stats,
}: ActionBarProps) {
  return (
    <div className='border-border/40 mb-2 flex flex-col gap-3 border-b py-2 md:flex-row md:items-center md:justify-between'>
      <div className='flex items-center gap-4'>
        <div className='flex h-8 items-center gap-2'>
          <span className='border-border/60 bg-muted/40 text-primary flex h-5 items-center justify-center rounded-md border px-1.5 text-xs font-semibold tabular-nums'>
            {itemCount}
          </span>
        </div>

        <div className='bg-border/40 hidden h-8 w-px md:block' />

        {/* Global Acknowledge */}
        <Button
          size='sm'
          variant='ghost'
          className='text-primary hover:bg-primary/5 hover:border-primary/20 h-8 gap-2 rounded-lg border border-transparent px-3 text-xs font-semibold tracking-wide'
          onClick={onAcknowledgeAll}
        >
          <CheckCircle2 className='h-3.5 w-3.5' />
          Acknowledge All
        </Button>
      </div>

      <div className='no-scrollbar flex items-center gap-2 overflow-x-auto'>
        {mode === 'logs' && (
          <div className='flex shrink-0 items-center gap-2'>
            <div className='group relative w-32 md:w-48 lg:w-64'>
              <Search className='group-focus-within:text-primary absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 transition-colors' />
              <input
                className='border-border/40 bg-background/50 focus:ring-primary/40 focus:border-primary/40 h-8 w-full rounded-lg border pr-4 pl-8 text-xs font-medium tracking-wide transition-all outline-none placeholder:text-zinc-400 focus:ring-1'
                placeholder='Search...'
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            <div className='border-border/40 bg-background/50 flex h-8 items-center gap-2 rounded-lg border px-2.5 shadow-sm'>
              <Filter className='h-3.5 w-3.5 text-zinc-400' />
              <select
                className='cursor-pointer bg-transparent text-xs font-medium tracking-wide text-zinc-200 outline-none'
                value={statusFilter}
                onChange={(e) =>
                  onStatusFilterChange(e.target.value as EventStatus | 'all')
                }
              >
                {EVENT_STATUS_OPTIONS.map((value) => (
                  <option
                    key={value}
                    value={value}
                    className='bg-background text-foreground'
                  >
                    {value === 'all' ? 'All' : value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {stats && (
          <div className='flex h-full items-center gap-2'>
            <div className='bg-border/40 mx-1 hidden h-8 w-px md:block' />
            <div className='shrink-0 origin-right scale-90'>
              <StatCards stats={stats} orientation='horizontal' />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
