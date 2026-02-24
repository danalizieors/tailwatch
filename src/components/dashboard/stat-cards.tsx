import { Activity, AlertTriangle, Binary, Shapes } from 'lucide-react'
import type { DashboardStats } from '~/lib/types'

interface StatCardsProps {
  stats: DashboardStats
}

export function StatCards({ stats }: StatCardsProps) {
  const items = [
    { label: 'Events', value: stats.totalEvents, icon: Binary, color: 'text-primary' },
    { label: 'Tracked', value: stats.entityCount, icon: Shapes, color: 'text-info' },
    { label: 'Active', value: stats.activeCount, icon: Activity, color: 'text-success' },
    { label: 'Errors', value: stats.errorCount, icon: AlertTriangle, color: 'text-destructive' },
  ]

  return (
    <div className="flex items-center gap-6 px-4 h-full">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none">{item.label}</span>
            <span className={`text-sm font-semibold font-mono tabular-nums mt-1 ${item.color}`}>{item.value.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
