import { useAuthActions } from '@convex-dev/auth/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import {
  ArrowRight,
  Gavel,
  ScrollText,
  Shield,
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

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

const EFFECTIVE_DATE = 'March 4, 2026'

function TermsPage() {
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
                Terms of Service
              </Badge>
              <Badge
                variant='outline'
                className='border-border/70 bg-card/70 px-3 py-1 text-xs font-medium tracking-wide text-zinc-400'
              >
                Effective {EFFECTIVE_DATE}
              </Badge>
            </div>
            <h1 className='text-foreground text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl'>
              Simple terms for using Tailwatch
            </h1>
            <p className='text-muted-foreground max-w-3xl text-base leading-7 md:text-lg'>
              These terms govern access to the hosted Tailwatch service. If you
              self-host Tailwatch, your deployment is your responsibility.
            </p>
          </section>

          <section className='grid gap-4 md:grid-cols-3'>
            <Card className='border-border/70 bg-card/70 shadow-none'>
              <CardHeader className='space-y-3'>
                <div className='border-primary/15 bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl border'>
                  <ScrollText className='h-4 w-4' />
                </div>
                <CardTitle className='text-sm font-semibold tracking-wide'>
                  Use it responsibly
                </CardTitle>
                <CardDescription className='text-sm leading-6'>
                  No abuse, spam, unlawful content, or attempts to disrupt the
                  service.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className='border-border/70 bg-card/70 shadow-none'>
              <CardHeader className='space-y-3'>
                <div className='border-info/20 bg-info/10 text-info flex h-10 w-10 items-center justify-center rounded-xl border'>
                  <Shield className='h-4 w-4' />
                </div>
                <CardTitle className='text-sm font-semibold tracking-wide'>
                  Your data stays yours
                </CardTitle>
                <CardDescription className='text-sm leading-6'>
                  You retain rights to content you send; you grant Tailwatch only
                  rights needed to operate the service.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className='border-border/70 bg-card/70 shadow-none'>
              <CardHeader className='space-y-3'>
                <div className='border-warning/30 bg-warning/10 text-warning flex h-10 w-10 items-center justify-center rounded-xl border'>
                  <Gavel className='h-4 w-4' />
                </div>
                <CardTitle className='text-sm font-semibold tracking-wide'>
                  Service is provided as-is
                </CardTitle>
                <CardDescription className='text-sm leading-6'>
                  Tailwatch is offered without warranties, especially while the
                  hosted service is evolving.
                </CardDescription>
              </CardHeader>
            </Card>
          </section>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                1. Acceptance and eligibility
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
              <p className='text-muted-foreground'>
                By using the hosted Tailwatch service, you agree to these terms.
                If you do not agree, do not use the hosted service.
              </p>
              <p className='text-muted-foreground'>
                You are responsible for making sure your use complies with laws
                and regulations applicable to you.
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                2. Accounts and security
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
              <p className='text-muted-foreground'>
                You are responsible for your account activity, API keys, and
                access to your devices.
              </p>
              <p className='text-muted-foreground'>
                Notify the project maintainer if you suspect unauthorized access
                or key compromise.
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                3. Acceptable use
              </CardTitle>
            </CardHeader>
            <CardContent className='text-sm leading-7 md:text-base'>
              <ul className='text-muted-foreground list-disc space-y-1 pl-5'>
                <li>No illegal content or illegal use.</li>
                <li>No service abuse, scraping abuse, spam, or denial attempts.</li>
                <li>
                  No attempts to bypass authentication, authorization, or usage
                  controls.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                4. Content and license
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
              <p className='text-muted-foreground'>
                You keep ownership of content you submit to Tailwatch. You grant
                a limited license for hosting, processing, and displaying that
                content to provide the service.
              </p>
              <p className='text-muted-foreground'>
                Tailwatch source code is currently available under the MIT
                license in this repository.
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                5. Availability, changes, and pricing
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
              <p className='text-muted-foreground'>
                Tailwatch may change over time. Features can evolve, and the
                hosted service may have outages or maintenance windows.
              </p>
              <p className='text-muted-foreground'>
                Hosted pricing is currently free. Future paid tiers may be
                introduced for advanced features or managed convenience.
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                6. Suspension and termination
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
              <p className='text-muted-foreground'>
                We may suspend or terminate access to protect the service,
                enforce these terms, or comply with legal obligations.
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                7. Disclaimers and limitation of liability
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
              <p className='text-muted-foreground'>
                The service is provided &quot;as is&quot; and &quot;as
                available,&quot; without warranties of any kind.
              </p>
              <p className='text-muted-foreground'>
                To the maximum extent permitted by law, Tailwatch and its
                maintainer are not liable for indirect, incidental, special, or
                consequential damages.
              </p>
            </CardContent>
          </Card>

          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                8. Updates to these terms
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
              <p className='text-muted-foreground'>
                These terms may be updated. Material changes will be reflected by
                updating the effective date on this page.
              </p>
            </CardContent>
          </Card>

        </main>
        <PublicFooter maxWidthClassName='max-w-5xl' />
      </div>
    </div>
  )
}
