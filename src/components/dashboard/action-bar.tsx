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
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-tight">
            {mode === 'logs' ? 'Event Log' : 'Status Registry'}
          </h2>
          <span className="flex h-5 items-center justify-center rounded-md border border-border/60 bg-muted/40 px-1.5 text-[10px] font-black tabular-nums text-muted-foreground">
            {itemCount}
          </span>
        </div>

        <div className="hidden w-px h-4 bg-border/40 md:block" />

        {/* Global Acknowledge */}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-lg px-2 text-[10px] font-bold uppercase tracking-widest text-primary gap-1.5 hover:bg-primary/5"
          onClick={onAcknowledgeAll}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Acknowledge All
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {mode === 'logs' && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="group relative w-32 md:w-48 lg:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
              <input
                className="h-8 w-full rounded-lg border border-border/40 bg-background/50 pl-8 pr-4 text-[11px] font-bold uppercase tracking-tight placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all"
                placeholder="Search..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            <div className="flex h-8 items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2.5 shadow-sm">
              <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />
              <select
                className="bg-transparent text-[10px] font-black uppercase tracking-tight outline-none cursor-pointer text-foreground/70"
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
        )}

        {stats && (
          <div className="flex items-center gap-2">
            <div className="hidden w-px h-4 bg-border/40 md:block mx-1" />
            <div className="shrink-0 scale-90 origin-right">
              <StatCards stats={stats} orientation="horizontal" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
