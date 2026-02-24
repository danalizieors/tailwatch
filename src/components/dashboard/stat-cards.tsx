import { Activity, AlertTriangle, Binary, Shapes } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import type { DashboardStats } from '~/lib/types'

interface StatCardsProps {
  stats: DashboardStats
}

export function StatCards({ stats }: StatCardsProps) {
  const items = [
    { label: 'Events Streamed', value: stats.totalEvents, icon: Binary, tone: 'text-primary' },
    { label: 'Tracked Entities', value: stats.entityCount, icon: Shapes, tone: 'text-sky-400' },
    { label: 'Active Processes', value: stats.activeCount, icon: Activity, tone: 'text-emerald-400' },
    { label: 'Anomalies Detected', value: stats.errorCount, icon: AlertTriangle, tone: 'text-red-400' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="group border-border/40 bg-card/40 backdrop-blur shadow-sm card-hover-effect transition-all overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">{item.label}</CardDescription>
            <CardTitle className="text-3xl font-light tracking-tight">{item.value.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 relative z-10 flex justify-end">
            <item.icon className={`h-6 w-6 ${item.tone} opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform`} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
