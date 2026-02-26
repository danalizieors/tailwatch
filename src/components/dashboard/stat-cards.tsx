import { Activity, AlertTriangle, Binary, Shapes } from 'lucide-react'
import type { DashboardStats } from '~/lib/types'

interface StatCardsProps {
  stats: DashboardStats
}

export function StatCards({ stats }: StatCardsProps) {
  const items = [
    { label: 'Events', value: stats.totalEvents, icon: Binary, color: 'text-primary' },
    { label: 'Paths', value: stats.pathCount ?? stats.entityCount, icon: Shapes, color: 'text-info' },
    { label: 'Busy', value: stats.busyCount ?? stats.activeCount, icon: AlertTriangle, color: 'text-amber-300' },
    { label: 'Idle', value: stats.idleCount ?? 0, icon: Activity, color: 'text-success' },
  ]

  return (
    <div className="flex h-full items-center gap-3 px-3 sm:gap-6 sm:px-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none">{item.label}</span>
            <span className={`text-sm font-semibold font-mono tabular-nums mt-1 ${item.color}`}>{item.value.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
