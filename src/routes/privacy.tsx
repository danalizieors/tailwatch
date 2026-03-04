import { useAuthActions } from '@convex-dev/auth/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import {
  ArrowRight,
  FileText,
  Lock,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import type { MouseEvent } from 'react'
import { PublicFooter } from '~/components/layout/public-footer'
import { Badge } from '~/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

const EFFECTIVE_DATE = 'March 4, 2026'

function PrivacyPage() {
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading } = useConvexAuth()

  const handleDashboardNavigation = async (event: MouseEvent) => {
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
    <div className='scroll-thin relative flex min-h-dvh w-full min-w-0 flex-1 overflow-x-hidden'>
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='bg-primary/10 absolute -top-40 -left-48 h-72 w-72 rounded-full blur-3xl' />
        <div className='bg-info/10 absolute top-32 -right-32 h-64 w-64 rounded-full blur-3xl' />
        <div className='bg-primary/5 absolute bottom-0 left-1/2 h-80 w-full -translate-x-1/2 rounded-full blur-3xl' />
      </div>

      <div className='relative z-10 w-full min-w-0'>
        <header
          className='border-border/50 bg-background/90 sticky top-0 z-50 border-b backdrop-blur-md'
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <nav
            aria-label='Primary'
            className='mx-auto flex min-h-16 w-full max-w-7xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-2 md:h-16 md:flex-nowrap md:gap-4 md:px-6 md:py-0'
          >
            <Link
              to='/'
              className='group flex min-w-0 shrink items-center gap-3 rounded-lg'
            >
              <div className='border-primary/25 bg-primary/10 text-primary group-hover:shadow-primary-glow flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300'>
                <Terminal className='h-4 w-4' />
              </div>
              <div className='flex min-w-0 flex-col leading-none'>
                <span className='text-foreground text-sm font-semibold tracking-tight'>
                  Tailwatch
                </span>
                <span className='mt-1 truncate text-xs font-medium tracking-wide text-zinc-400'>
                  Event Monitor
                </span>
              </div>
            </Link>

            <div className='ml-auto flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto'>
              <Link
                to='/pricing'
                className='border-border/70 bg-card/70 text-foreground focus-visible:ring-ring inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold tracking-wide shadow-sm transition-all duration-200 hover:bg-card/90 focus-visible:ring-2 focus-visible:outline-none'
              >
                Pricing
              </Link>
              <Link
                to='/$volumeId'
                params={{ volumeId: 'personal' }}
                onClick={(event) => void handleDashboardNavigation(event)}
                className='border-primary/35 bg-primary text-primary-foreground focus-visible:ring-ring shadow-primary/20 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-xs font-semibold tracking-wide shadow-sm transition-all duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none active:scale-95'
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

        <main className='mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-12'>
          <section className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge
                variant='outline'
                className='border-border/70 bg-card/70 text-foreground px-3 py-1 text-xs font-semibold tracking-wide'
              >
                Privacy Policy
              </Badge>
              <Badge
                variant='outline'
                className='border-border/70 bg-card/70 px-3 py-1 text-xs font-medium tracking-wide text-zinc-400'
              >
                Effective {EFFECTIVE_DATE}
              </Badge>
            </div>
            <h1 className='text-foreground text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl'>
              Privacy, in plain language
            </h1>
            <p className='text-muted-foreground max-w-3xl text-base leading-7 md:text-lg'>
              Tailwatch collects only what is needed to run the hosted service.
              No ad tracking, no data brokerage, no selling personal data.
            </p>
          </section>

          <section className='grid gap-4 md:grid-cols-3'>
            <Card className='border-border/70 bg-card/70 shadow-none'>
              <CardHeader className='space-y-3'>
                <div className='border-primary/15 bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl border'>
                  <Lock className='h-4 w-4' />
                </div>
                <CardTitle className='text-sm font-semibold tracking-wide'>
                  Minimal collection
                </CardTitle>
                <CardDescription className='text-sm leading-6'>
                  We store account, device, and event data needed to operate
                  Tailwatch.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className='border-border/70 bg-card/70 shadow-none'>
              <CardHeader className='space-y-3'>
                <div className='border-info/20 bg-info/10 text-info flex h-10 w-10 items-center justify-center rounded-xl border'>
                  <ShieldCheck className='h-4 w-4' />
                </div>
                <CardTitle className='text-sm font-semibold tracking-wide'>
                  No ad-tech profiling
                </CardTitle>
                <CardDescription className='text-sm leading-6'>
                  We do not run ad networks or behavioral ad targeting in
                  Tailwatch.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className='border-border/70 bg-card/70 shadow-none'>
              <CardHeader className='space-y-3'>
                <div className='border-warning/30 bg-warning/10 text-warning flex h-10 w-10 items-center justify-center rounded-xl border'>
                  <FileText className='h-4 w-4' />
                </div>
                <CardTitle className='text-sm font-semibold tracking-wide'>
                  You control your content
                </CardTitle>
                <CardDescription className='text-sm leading-6'>
                  Your event payloads stay yours. We use them only to provide the
                  service.
                </CardDescription>
              </CardHeader>
            </Card>
          </section>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                What data we process
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 text-sm leading-7 md:text-base'>
              <div>
                <p className='text-foreground font-semibold'>Account data</p>
                <p className='text-muted-foreground'>
                  If you sign in via GitHub, we receive basic profile details
                  made available by your provider (such as name, email, avatar).
                </p>
              </div>
              <div>
                <p className='text-foreground font-semibold'>Telemetry content</p>
                <p className='text-muted-foreground'>
                  Events you publish to Tailwatch, including paths, status,
                  timestamps, and optional content fields.
                </p>
              </div>
              <div>
                <p className='text-foreground font-semibold'>Device data</p>
                <p className='text-muted-foreground'>
                  Device key, device name, browser/system metadata, last-seen
                  timestamps, and (if enabled) push subscription details.
                </p>
              </div>
              <div>
                <p className='text-foreground font-semibold'>Volume data</p>
                <p className='text-muted-foreground'>
                  Volume names, API keys, key status, and notification settings.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                Local storage and cookies
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
              <p className='text-muted-foreground'>
                Tailwatch uses essential local storage/cookie-like mechanisms for
                authentication sessions, device identity, and UX state (for
                example last-seen timestamps and device naming).
              </p>
              <p className='text-muted-foreground'>
                Tailwatch does not currently use advertising cookies.
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                Why and how we use data
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm leading-7 md:text-base'>
              <ul className='text-muted-foreground list-disc space-y-1 pl-5'>
                <li>To run the service and show your dashboard data.</li>
                <li>To authenticate users and protect accounts.</li>
                <li>To deliver push notifications when enabled.</li>
                <li>To improve stability, security, and abuse prevention.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                Third-party processors
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
              <p className='text-muted-foreground'>
                The hosted service relies on infrastructure and auth providers,
                currently including Cloudflare, Convex, GitHub authentication,
                and browser push services.
              </p>
              <p className='text-muted-foreground'>
                If you self-host Tailwatch, your deployment choices and data
                handling are controlled by you.
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                Retention and your choices
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm leading-7 md:text-base'>
              <ul className='text-muted-foreground list-disc space-y-1 pl-5'>
                <li>
                  You can delete devices and volumes from in-app settings (which
                  removes associated records in the hosted service).
                </li>
                <li>
                  You can disable browser notifications at any time in your
                  browser and in Tailwatch settings.
                </li>
                <li>
                  You can request account/data help through the project support
                  channel.
                </li>
              </ul>
            </CardContent>
          </Card>

        </main>
        <PublicFooter maxWidthClassName='max-w-5xl' />
      </div>
    </div>
  )
}
