import * as React from 'react'
import { cn } from '~/lib/utils'

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-muted-foreground text-xs font-medium', className)}
      {...props}
    />
  )
}
