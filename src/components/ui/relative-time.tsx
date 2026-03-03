import { useEffect, useState } from 'react'
import { formatRelative } from '~/lib/format'

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

  const formatted = formatRelative(time)

  return (
    <span 
      key={formatted}
      className={cn(className, "animate-flicker")} 
      title={title}
    >
      {formatted}
    </span>
  )
}

import { cn } from '~/lib/utils'
