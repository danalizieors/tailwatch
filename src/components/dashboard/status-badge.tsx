import { useEffect, useRef, useState } from 'react'
import { cn } from '~/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const [isChanging, setIsChanging] = useState(false)
  const previousStatusRef = useRef<string | null>(null)

  useEffect(() => {
    if (previousStatusRef.current === null) {
      previousStatusRef.current = status
      return
    }

    if (previousStatusRef.current !== status) {
      previousStatusRef.current = status
      setIsChanging(true)
    }
  }, [status])

  return (
    <span
      className={cn(className, isChanging && 'animate-glow')}
      onAnimationEnd={() => setIsChanging(false)}
    >
      {status.toUpperCase()}
    </span>
  )
}
