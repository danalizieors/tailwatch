import { Link } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { ArrowRight, Github } from 'lucide-react'
import { TailwatchBrand } from '~/components/layout/tailwatch-brand'
import { cn } from '~/lib/utils'

interface PublicHeaderProps {
  navClassName?: string
}

const GITHUB_REPOSITORY_URL = 'https://github.com/danalizieors/tailwatch'

const publicHeaderActionBaseClassName =
  'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 sm:px-6 text-xs font-bold tracking-tight transition-all active:scale-[0.98]'

export function PublicHeader({
  navClassName,
}: PublicHeaderProps) {
  const { isAuthenticated, isLoading } = useConvexAuth()

  return (
    <header
      className='sticky top-0 z-50 border-b border-white/5 bg-zinc-900/60 backdrop-blur-xl'
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <nav
        aria-label='Primary'
        className={cn(
          'mx-auto flex h-16 w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-4 sm:gap-3 md:h-20 md:gap-4 md:px-6',
          navClassName,
        )}
      >
        <Link to='/' className='min-w-0 shrink'>
          <TailwatchBrand />
        </Link>

        <div className='ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-3'>
          <a
            href={GITHUB_REPOSITORY_URL}
            target='_blank'
            rel='noreferrer'
            aria-label='Open Tailwatch repository on GitHub'
            className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white'
          >
            <Github className='h-4 w-4' />
          </a>

          {!isLoading && isAuthenticated ? (
            <Link
              to='/dashboard/$volumeId'
              params={{ volumeId: 'personal' }}
              className={cn(
                publicHeaderActionBaseClassName,
                'bg-primary shadow-primary/20 text-black shadow-lg hover:opacity-90',
              )}
            >
              Dashboard
              <ArrowRight className='h-3.5 w-3.5' />
            </Link>
          ) : (
            <Link
              to='/sign-in'
              className={cn(
                publicHeaderActionBaseClassName,
                'bg-primary shadow-primary/20 text-black shadow-lg hover:opacity-90',
              )}
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
