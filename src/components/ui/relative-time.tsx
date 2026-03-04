import { useEffect, useRef, useState } from 'react'
import { formatAbsolute, formatRelative } from '~/lib/format'
import { cn } from '~/lib/utils'

interface RelativeTimeProps {
  time: string | number | Date
  className?: string
  title?: string
}

export function RelativeTime({ time, className, title }: RelativeTimeProps) {
  const [, setTick] = useState(0)
  const [flashSequence, setFlashSequence] = useState(0)
  const previousRelativeRef = useRef<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const relative = formatRelative(time)
  const absolute = formatAbsolute(time)

  useEffect(() => {
    if (previousRelativeRef.current === null) {
      previousRelativeRef.current = relative
      return
    }

    if (previousRelativeRef.current !== relative) {
      previousRelativeRef.current = relative
      setFlashSequence((value) => value + 1)
    }
  }, [relative])

  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-x-2 tabular-nums',
        className,
      )}
      title={title}
    >
      <span
        key={`relative-${flashSequence}`}
        className={cn(
          'font-bold whitespace-nowrap text-zinc-400',
          flashSequence > 0 && 'animate-flash',
        )}
      >
        {relative}
      </span>
      <span className='font-medium whitespace-nowrap text-zinc-500'>
        {absolute}
      </span>
    </span>
  )
}
