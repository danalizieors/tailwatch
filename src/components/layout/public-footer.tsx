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
    <footer className='border-white/5 bg-zinc-900/60 border-t backdrop-blur-xl'>
      <div
        className={cn(
          'mx-auto flex w-full min-w-0 flex-col gap-6 px-4 py-10 text-xs font-bold tracking-tight text-zinc-500 md:flex-row md:items-center md:justify-between md:px-6',
          maxWidthClassName,
        )}
      >
        <div className='flex flex-wrap items-center gap-4'>
          <div className='bg-primary/10 border border-primary/20 flex h-8 w-8 items-center justify-center rounded-lg'>
            <Terminal className='text-primary h-4 w-4' />
          </div>
          <div className='flex flex-col'>
            <span className='text-foreground uppercase tracking-widest'>Tailwatch</span>
            <span className='text-[10px] text-zinc-600 font-mono'>{description}</span>
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-6'>
          {leadText ? <span className='text-zinc-400'>{leadText}</span> : null}
          <Link
            to='/pricing'
            className='text-zinc-500 transition-colors hover:text-primary uppercase tracking-widest'
          >
            Pricing
          </Link>
          <Link
            to='/privacy'
            className='text-zinc-500 transition-colors hover:text-primary uppercase tracking-widest'
          >
            Privacy
          </Link>
          <Link
            to='/terms'
            className='text-zinc-500 transition-colors hover:text-primary uppercase tracking-widest'
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  )
}
