import { Activity, AlertTriangle, Binary, Shapes } from 'lucide-react'
import type { DashboardStats } from '~/lib/types'
import { cn } from '~/lib/utils'

interface StatCardsProps {
  stats: DashboardStats
  orientation?: 'horizontal' | 'vertical'
}

export function StatCards({
  stats,
  orientation = 'horizontal',
}: StatCardsProps) {
  const items = [
    {
      label: 'Events',
      value: stats.totalEvents,
      icon: Binary,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Paths',
      value: stats.pathCount,
      icon: Shapes,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      label: 'Busy',
      value: stats.busyCount,
      icon: AlertTriangle,
      color: 'text-amber-300',
      bgColor: 'bg-amber-300/10',
    },
    {
      label: 'Idle',
      value: stats.idleCount ?? 0,
      icon: Activity,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
  ]

  return (
    <div
      className={cn(
        'flex gap-3 sm:gap-4',
        orientation === 'horizontal'
          ? 'flex-row items-center px-3'
          : 'flex-col',
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'flex items-center gap-3',
            orientation === 'vertical' &&
              'bg-card/50 border-border/40 rounded-lg border p-2',
          )}
        >
          {orientation === 'vertical' && (
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border border-current/20',
                item.bgColor,
                item.color,
              )}
            >
              <item.icon className='h-4 w-4' />
            </div>
          )}
          <div className='flex flex-col'>
            <span className='mb-1.5 text-xs leading-none font-medium tracking-wide text-zinc-300'>
              {item.label}
            </span>
            <span
              className={cn(
                'font-mono text-sm font-semibold tabular-nums',
                orientation === 'horizontal' ? item.color : 'text-foreground',
              )}
            >
              {item.value.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
