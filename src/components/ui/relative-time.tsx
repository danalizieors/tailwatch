import { useEffect, useState } from 'react'
import { formatAbsolute, formatRelative } from '~/lib/format'
import { cn } from '~/lib/utils'

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
      className={cn(
        'inline-flex flex-wrap items-center gap-x-2 tabular-nums',
        className,
      )}
      title={title}
    >
      <span
        key={relative}
        className='animate-flash font-bold whitespace-nowrap text-zinc-400'
      >
        {relative}
      </span>
      <span className='font-medium whitespace-nowrap text-zinc-500'>
        {absolute}
      </span>
    </span>
  )
}
