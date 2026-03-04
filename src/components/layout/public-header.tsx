import { useAuthActions } from '@convex-dev/auth/react'
import { Link } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { ArrowRight } from 'lucide-react'
import type { MouseEvent } from 'react'
import { TailwatchBrand } from '~/components/layout/tailwatch-brand'
import { cn } from '~/lib/utils'

interface PublicHeaderProps {
  showPricingLink?: boolean
  navClassName?: string
}

const publicHeaderActionBaseClassName =
  'inline-flex min-h-11 items-center gap-2 rounded-lg px-6 text-xs font-bold tracking-tight transition-all active:scale-[0.98]'

export function PublicHeader({
  showPricingLink = true,
  navClassName,
}: PublicHeaderProps) {
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading } = useConvexAuth()

  const handleDashboardNavigation = async (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    if (isLoading) {
      event.preventDefault()
      return
    }

    if (isAuthenticated) {
      return
    }

    event.preventDefault()
    try {
      await signIn('github', { redirectTo: '/personal' })
    } catch (error) {
      console.error('Failed to initiate sign-in', error)
    }
  }

  return (
    <header
      className='border-white/5 bg-zinc-900/60 sticky top-0 z-50 border-b backdrop-blur-xl'
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <nav
        aria-label='Primary'
        className={cn(
          'mx-auto flex min-h-20 w-full max-w-7xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-2 md:h-20 md:flex-nowrap md:gap-4 md:px-6 md:py-0',
          navClassName,
        )}
      >
        <Link to='/'>
          <TailwatchBrand />
        </Link>

        <div className='ml-auto flex w-full min-w-0 items-center justify-end gap-3 sm:w-auto'>
          {showPricingLink ? (
            <Link
              to='/pricing'
              className={cn(
                publicHeaderActionBaseClassName,
                'border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-foreground',
              )}
            >
              Pricing
            </Link>
          ) : null}

          <Link
            to='/$volumeId'
            params={{ volumeId: 'personal' }}
            onClick={(event) => void handleDashboardNavigation(event)}
            className={cn(
              publicHeaderActionBaseClassName,
              'bg-primary text-black shadow-lg shadow-primary/20 hover:opacity-90',
            )}
          >
            {!isLoading && !isAuthenticated ? (
              <>
                <span className='hidden sm:inline'>Sign in with GitHub</span>
                <span className='sm:hidden'>Sign in</span>
              </>
            ) : (
              <>
                <span className='hidden sm:inline'>Open Dashboard</span>
                <span className='sm:hidden'>Open</span>
              </>
            )}
            <ArrowRight className='h-3.5 w-3.5' />
          </Link>
        </div>
      </nav>
    </header>
  )
}
