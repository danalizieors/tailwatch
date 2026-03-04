import { createFileRoute } from '@tanstack/react-router'
import { FileText, Lock, ShieldCheck } from 'lucide-react'
import { PublicFooter } from '~/components/layout/public-footer'
import { PublicHeader } from '~/components/layout/public-header'
import { PublicPageShell } from '~/components/layout/public-page-shell'
import { Badge } from '~/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [{ title: 'Privacy | Tailwatch' }],
  }),
  component: PrivacyPage,
})

const EFFECTIVE_DATE = 'March 4, 2026'

function PrivacyPage() {
  return (
    <PublicPageShell>
      <PublicHeader />

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
            Tailwatch collects only what is needed to run the hosted service. No
            ad tracking, no data brokerage, no selling personal data.
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
                If you sign in via GitHub, we receive basic profile details made
                available by your provider (such as name, email, avatar).
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
              currently including Cloudflare, Convex, GitHub authentication, and
              browser push services.
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
    </PublicPageShell>
  )
}
