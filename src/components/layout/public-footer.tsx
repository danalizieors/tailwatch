import { Link } from '@tanstack/react-router'
import { TailwatchBrand } from '~/components/layout/tailwatch-brand'
import { cn } from '~/lib/utils'

interface PublicFooterProps {
  maxWidthClassName?: string
}

export function PublicFooter({
  maxWidthClassName = 'max-w-7xl',
}: PublicFooterProps) {
  return (
    <footer className='border-t border-white/5 bg-zinc-900/60 backdrop-blur-xl'>
      <div
        className={cn(
          'mx-auto flex w-full min-w-0 flex-col gap-6 px-4 py-10 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between md:px-6',
          maxWidthClassName,
        )}
      >
        <div className='flex min-w-0 items-center'>
          <Link to='/' className='w-fit'>
            <TailwatchBrand />
          </Link>
        </div>

        <div className='flex flex-wrap items-center gap-6'>
          <Link
            to='/privacy'
            className='text-zinc-400 transition-colors hover:text-primary'
          >
            Privacy
          </Link>
          <Link
            to='/terms'
            className='text-zinc-400 transition-colors hover:text-primary'
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  )
}
