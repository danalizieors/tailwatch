import { Link } from '@tanstack/react-router'
import { Terminal } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

interface PublicFooterProps {
  maxWidthClassName?: string
  description?: string
  leadText?: ReactNode
}

export function PublicFooter({
  maxWidthClassName = 'max-w-7xl',
  description = 'Realtime event monitor',
  leadText,
}: PublicFooterProps) {
  return (
    <footer className='border-border/40 bg-background/50 border-t'>
      <div
        className={cn(
          'mx-auto flex w-full min-w-0 flex-col gap-4 px-4 py-6 text-xs font-medium tracking-wide text-zinc-500 md:flex-row md:items-center md:justify-between md:px-6',
          maxWidthClassName,
        )}
      >
        <div className='flex flex-wrap items-center gap-2'>
          <Terminal className='text-primary h-4 w-4' />
          <span className='text-zinc-400'>Tailwatch</span>
          <span>{description}</span>
        </div>
        <div className='flex flex-wrap items-center gap-4'>
          {leadText ? <span>{leadText}</span> : null}
          <Link
            to='/pricing'
            className='text-zinc-300 transition-colors hover:text-foreground'
          >
            Pricing
          </Link>
          <Link
            to='/privacy'
            className='text-zinc-300 transition-colors hover:text-foreground'
          >
            Privacy
          </Link>
          <Link
            to='/terms'
            className='text-zinc-300 transition-colors hover:text-foreground'
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  )
}
