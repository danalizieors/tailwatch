import { Activity, AlertTriangle, Binary, Shapes } from 'lucide-react'
import type { DashboardStats } from '~/lib/types'

interface StatCardsProps {
  stats: DashboardStats
}

export function StatCards({ stats }: StatCardsProps) {
  const items = [
    { label: 'Events Streamed', value: stats.totalEvents, icon: Binary, tone: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Tracked Entities', value: stats.entityCount, icon: Shapes, tone: 'text-sky-400', bg: 'bg-sky-500/10' },
    { label: 'Active Processes', value: stats.activeCount, icon: Activity, tone: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Anomalies', value: stats.errorCount, icon: AlertTriangle, tone: 'text-red-400', bg: 'bg-red-500/10' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 bg-background/50 border border-border/40 rounded-lg px-4 py-2 shadow-sm backdrop-blur">
          <div className={`p-1.5 rounded-md ${item.bg}`}>
            <item.icon className={`h-4 w-4 ${item.tone}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{item.label}</span>
            <span className="text-sm font-semibold font-mono leading-none tracking-tight text-foreground/90 mt-0.5">{item.value.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
