import { createFileRoute } from '@tanstack/react-router'
import { Gavel, ScrollText, Shield } from 'lucide-react'
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

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [{ title: 'Terms | Tailwatch' }],
  }),
  component: TermsPage,
})

const EFFECTIVE_DATE = 'March 4, 2026'

function TermsPage() {
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
          <Card className='border-primary/30 bg-primary/5 shadow-sm'>
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
          <Card className='border-info/30 bg-info/5 shadow-sm'>
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
          <Card className='border-warning/30 bg-warning/5 shadow-sm'>
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

        <Card className='border-border bg-card shadow-md'>
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

        <Card className='border-border bg-card shadow-md'>
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

        <Card className='border-border bg-card shadow-md'>
          <CardHeader>
            <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
              3. Acceptable use
            </CardTitle>
          </CardHeader>
          <CardContent className='text-sm leading-7 md:text-base'>
            <ul className='text-muted-foreground list-disc space-y-1 pl-5'>
              <li>No illegal content or illegal use.</li>
              <li>
                No service abuse, scraping abuse, spam, or denial attempts.
              </li>
              <li>
                No attempts to bypass authentication, authorization, or usage
                controls.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className='border-border bg-card shadow-md'>
          <CardHeader>
            <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
              4. Content and license
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
            <p className='text-muted-foreground'>
              You keep ownership of content you submit to Tailwatch. You grant a
              limited license for hosting, processing, and displaying that
              content to provide the service.
            </p>
            <p className='text-muted-foreground'>
              Tailwatch source code is currently available under the MIT license
              in this repository.
            </p>
          </CardContent>
        </Card>

        <Card className='border-border bg-card shadow-md'>
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

        <Card className='border-border bg-card shadow-md'>
          <CardHeader>
            <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
              6. Suspension and termination
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm leading-7 md:text-base'>
            <p className='text-muted-foreground'>
              We may suspend or terminate access to protect the service, enforce
              these terms, or comply with legal obligations.
            </p>
          </CardContent>
        </Card>

        <Card className='border-border bg-card shadow-md'>
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

        <Card className='border-border bg-card shadow-md'>
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
    </PublicPageShell>
  )
}
