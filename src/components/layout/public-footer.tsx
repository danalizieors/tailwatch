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
    <footer
      className='mt-auto border-t border-white/10 bg-zinc-950/75 backdrop-blur-xl'
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className={cn(
          'mx-auto flex w-full min-w-0 flex-col gap-5 px-4 py-6 text-sm text-zinc-500 sm:py-8 md:flex-row md:items-center md:justify-between md:px-6 md:py-10',
          maxWidthClassName,
        )}
      >
        <div className='flex min-w-0 flex-col items-center gap-2 text-center md:items-start md:text-left'>
          <Link to='/' className='w-fit'>
            <TailwatchBrand className='justify-center md:justify-start' />
          </Link>
          <p className='text-xs text-zinc-500/90'>
            Hierarchical event monitor with push notifications.
          </p>
        </div>

        <nav
          aria-label='Footer'
          className='flex w-full items-center justify-center gap-2 sm:gap-4 md:w-auto md:justify-end'
        >
          <Link
            to='/contact'
            className='rounded-md px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:text-primary'
          >
            Contact
          </Link>
          <Link
            to='/privacy'
            className='rounded-md px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:text-primary'
          >
            Privacy
          </Link>
          <Link
            to='/terms'
            className='rounded-md px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:text-primary'
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  )
}
