import { createFileRoute } from '@tanstack/react-router'
import { FileText, Lock, ShieldCheck } from 'lucide-react'
import { PublicFooter } from '~/components/layout/public-footer'
import { PublicHeader } from '~/components/layout/public-header'
import { PublicPageShell } from '~/components/layout/public-page-shell'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { buildPublicPageHead } from '~/lib/seo'

export const Route = createFileRoute('/privacy')({
  head: () =>
    buildPublicPageHead({
      title: 'Privacy Policy | Tailwatch',
      description:
        'Read how Tailwatch handles account, device, and event data for the hosted service.',
      path: '/privacy',
      type: 'article',
    }),
  component: PrivacyPage,
})

const EFFECTIVE_DATE = 'March 5, 2026'

function PrivacyPage() {
  return (
    <PublicPageShell>
      <PublicHeader />

      <main className='mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-12'>
        <section className='space-y-4'>
          <h1 className='text-foreground text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl'>
            Privacy Policy
          </h1>
          <p className='text-muted-foreground max-w-3xl text-base leading-7 md:text-lg'>
            This Privacy Policy explains what data Tailwatch processes for the
            hosted service, how we use it, and which third-party providers help
            us operate it. We do not sell personal data.
          </p>
          <p className='text-muted-foreground text-sm'>Effective {EFFECTIVE_DATE}</p>
        </section>

        <section className='grid gap-4 md:grid-cols-3'>
          <Card className='border-primary/30 bg-primary/5 shadow-sm'>
            <CardHeader className='space-y-3'>
              <div className='border-primary/15 bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl border'>
                <Lock className='h-4 w-4' />
              </div>
              <CardTitle className='text-sm font-semibold tracking-wide'>
                Minimal collection
              </CardTitle>
              <CardDescription className='text-sm leading-6'>
                We collect only the account, device, and event data required to
                operate Tailwatch and protect accounts.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className='border-info/30 bg-info/5 shadow-sm'>
            <CardHeader className='space-y-3'>
              <div className='border-info/20 bg-info/10 text-info flex h-10 w-10 items-center justify-center rounded-xl border'>
                <ShieldCheck className='h-4 w-4' />
              </div>
              <CardTitle className='text-sm font-semibold tracking-wide'>
                No ad-tech profiling
              </CardTitle>
              <CardDescription className='text-sm leading-6'>
                We do not use ad networks, behavioral advertising profiles, or
                cross-site ad trackers.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className='border-warning/30 bg-warning/5 shadow-sm'>
            <CardHeader className='space-y-3'>
              <div className='border-warning/30 bg-warning/10 text-warning flex h-10 w-10 items-center justify-center rounded-xl border'>
                <FileText className='h-4 w-4' />
              </div>
              <CardTitle className='text-sm font-semibold tracking-wide'>
                You control your content
              </CardTitle>
              <CardDescription className='text-sm leading-6'>
                You keep ownership of your event payloads. We process them only
                to provide the service.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <Card className='border-border bg-card shadow-md'>
          <CardHeader>
            <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
              What data we process
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4 text-sm leading-7 md:text-base'>
            <div>
              <p className='text-foreground font-semibold'>Account data</p>
              <p className='text-muted-foreground'>
                If you sign in with GitHub, we receive basic profile details
                your provider makes available (such as name, email, and avatar).
              </p>
            </div>
            <div>
              <p className='text-foreground font-semibold'>
                Published event data
              </p>
              <p className='text-muted-foreground'>
                Event records you explicitly send to Tailwatch (for example,
                through publish API requests), including path, status,
                timestamp, and optional content text.
              </p>
            </div>
            <div>
              <p className='text-foreground font-semibold'>Device data</p>
              <p className='text-muted-foreground'>
                Device key, device name, browser/system metadata, last-seen
                timestamps, and (if enabled) web push subscription details.
              </p>
            </div>
            <div>
              <p className='text-foreground font-semibold'>Volume data</p>
              <p className='text-muted-foreground'>
                Volume names, API keys, key status, and notification settings.
              </p>
            </div>
            <div>
              <p className='text-foreground font-semibold'>
                Request and security metadata
              </p>
              <p className='text-muted-foreground'>
                Standard request metadata may include IP address, user-agent,
                route path, and timestamp for service delivery, security, and
                reliability operations.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className='border-border bg-card shadow-md'>
          <CardHeader>
            <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
              Local storage and cookies
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
            <p className='text-muted-foreground'>
              Tailwatch uses essential local storage/cookie-like mechanisms for
              authentication sessions, device identity, and user experience
              state.
            </p>
            <p className='text-muted-foreground'>
              We do not currently use advertising cookies.
            </p>
          </CardContent>
        </Card>

        <Card className='border-border bg-card shadow-md'>
          <CardHeader>
            <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
              Why and how we use data
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm leading-7 md:text-base'>
            <ul className='text-muted-foreground list-disc space-y-1 pl-5'>
              <li>To operate the service and display your dashboard data.</li>
              <li>To authenticate users and protect accounts.</li>
              <li>To deliver push notifications when you enable them.</li>
              <li>To improve stability, security, and abuse prevention.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className='border-border bg-card shadow-md'>
          <CardHeader>
            <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
              Third-party services
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
            <p className='text-muted-foreground'>
              Tailwatch currently uses the following providers to run the hosted
              service:
            </p>
            <div>
              <p className='text-foreground font-semibold'>
                Cloudflare (hosting, edge, and security)
              </p>
              <p className='text-muted-foreground'>
                Delivers the application and API at the edge and may process
                request metadata (for example IP address and user-agent) for
                delivery, observability, and abuse protection.
              </p>
            </div>
            <div>
              <p className='text-foreground font-semibold'>
                Convex (application backend and data store)
              </p>
              <p className='text-muted-foreground'>
                Stores and processes account, device, volume, and event data to
                power Tailwatch features.
              </p>
            </div>
            <div>
              <p className='text-foreground font-semibold'>
                GitHub OAuth (sign-in provider)
              </p>
              <p className='text-muted-foreground'>
                If you sign in with GitHub, GitHub provides account/profile data
                according to your GitHub settings and permissions.
              </p>
            </div>
            <div>
              <p className='text-foreground font-semibold'>
                Browser push providers (Apple, Google, Mozilla)
              </p>
              <p className='text-muted-foreground'>
                When notifications are enabled, your browser shares subscription
                endpoint details with its push vendor, and encrypted
                notification payloads are sent through that vendor.
              </p>
            </div>
            <p className='text-muted-foreground'>
              If you self-host Tailwatch, your own infrastructure choices and
              data handling practices apply.
            </p>
          </CardContent>
        </Card>

        <Card className='border-border bg-card shadow-md'>
          <CardHeader>
            <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
              Retention and your choices
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm leading-7 md:text-base'>
            <ul className='text-muted-foreground list-disc space-y-1 pl-5'>
              <li>
                You can delete devices and volumes from in-app settings, which
                removes associated records from the hosted service.
              </li>
              <li>
                You can disable browser notifications at any time in your
                browser and in Tailwatch settings.
              </li>
              <li>
                You can request account or data help through the project support
                channel.
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
      <PublicFooter maxWidthClassName='max-w-5xl' />
    </PublicPageShell>
  )
}
