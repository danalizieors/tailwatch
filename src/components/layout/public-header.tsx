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
  'focus-visible:ring-ring inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border text-xs font-semibold tracking-wide shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none'

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
      className='border-border/50 bg-background/90 sticky top-0 z-50 border-b backdrop-blur-md'
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <nav
        aria-label='Primary'
        className={cn(
          'mx-auto flex min-h-16 w-full max-w-7xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-2 md:h-16 md:flex-nowrap md:gap-4 md:px-6 md:py-0',
          navClassName,
        )}
      >
        <Link to='/'>
          <TailwatchBrand />
        </Link>

        <div className='ml-auto flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto'>
          {showPricingLink ? (
            <Link
              to='/pricing'
              className={cn(
                publicHeaderActionBaseClassName,
                'border-border/70 bg-card/70 text-foreground hover:bg-card/90 px-3',
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
              'border-primary/35 bg-primary text-primary-foreground shadow-primary/20 px-4 hover:opacity-90 active:scale-95',
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
