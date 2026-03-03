import { Search, Filter, CheckCircle2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { StatCards } from './stat-cards'
import type { EventStatus, DashboardStats } from '~/lib/types'

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
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between py-2 border-b border-border/40 mb-2">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 leading-none mb-1.5 ml-1">Context View</span>
          <div className="flex items-center gap-2 h-8">
            <h2 className="text-[11px] font-black text-foreground uppercase tracking-widest px-1">
              {mode === 'logs' ? 'Event Log' : 'Status Registry'}
            </h2>
            <span className="flex h-5 items-center justify-center rounded-md border border-border/60 bg-muted/40 px-1.5 text-[10px] font-black tabular-nums text-primary">
              {itemCount}
            </span>
          </div>
        </div>

        <div className="hidden w-px h-8 bg-border/40 md:block self-end mb-1" />

        {/* Global Acknowledge */}
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 leading-none mb-1.5 ml-1">Actions</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg px-3 text-[10px] font-black uppercase tracking-widest text-primary gap-2 hover:bg-primary/5 border border-transparent hover:border-primary/20"
            onClick={onAcknowledgeAll}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Acknowledge All
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar self-end mb-0.5">
        {mode === 'logs' && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 leading-none mb-1.5 ml-1">Filter</span>
              <div className="flex items-center gap-2">
                <div className="group relative w-32 md:w-48 lg:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                  <input
                    className="h-8 w-full rounded-lg border border-border/40 bg-background/50 pl-8 pr-4 text-[10px] font-black uppercase tracking-widest placeholder:text-zinc-400 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                </div>

                <div className="flex h-8 items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2.5 shadow-sm">
                  <Filter className="h-3.5 w-3.5 text-zinc-400" />
                  <select
                    className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-zinc-200"
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value as EventStatus | 'all')}
                  >
                    {EVENT_STATUS_OPTIONS.map((value) => (
                      <option key={value} value={value} className="bg-background text-foreground uppercase">
                        {value === 'all' ? 'All' : value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {stats && (
          <div className="flex items-center gap-2 h-full pt-4">
            <div className="hidden w-px h-8 bg-border/40 md:block mx-1" />
            <div className="shrink-0 scale-90 origin-right">
              <StatCards stats={stats} orientation="horizontal" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
