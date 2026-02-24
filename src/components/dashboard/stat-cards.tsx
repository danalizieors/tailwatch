import { Activity, AlertTriangle, Binary, Shapes } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import type { DashboardStats } from '~/lib/types'

interface StatCardsProps {
  stats: DashboardStats
}

export function StatCards({ stats }: StatCardsProps) {
  const items = [
    { label: 'Events', value: stats.totalEvents, icon: Binary, tone: 'text-slate-700' },
    { label: 'Tracked Entities', value: stats.entityCount, icon: Shapes, tone: 'text-teal-700' },
    { label: 'Working', value: stats.activeCount, icon: Activity, tone: 'text-emerald-700' },
    { label: 'Errors', value: stats.errorCount, icon: AlertTriangle, tone: 'text-red-700' },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="border-white/70 bg-white/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl">{item.value}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <item.icon className={`h-4 w-4 ${item.tone}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

