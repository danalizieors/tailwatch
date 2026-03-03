import { useEffect, useState } from 'react'
import { formatRelative, formatAbsolute } from '~/lib/format'

interface RelativeTimeProps {
  time: string | number | Date
  className?: string
  title?: string
}

export function RelativeTime({ time, className, title }: RelativeTimeProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const relative = formatRelative(time)
  const absolute = formatAbsolute(time)

  return (
    <span 
      className={cn("inline-flex flex-wrap items-center gap-x-2 tabular-nums", className)} 
      title={title}
    >
      <span 
        key={relative}
        className="whitespace-nowrap font-bold text-zinc-400 animate-flash"
      >
        {relative}
      </span>
      <span className="text-zinc-500 font-medium whitespace-nowrap">
        {absolute}
      </span>
    </span>
  )
}

import { cn } from '~/lib/utils'
