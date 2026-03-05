import { createFileRoute } from '@tanstack/react-router'
import { Gavel, ScrollText, Shield } from 'lucide-react'
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

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [{ title: 'Terms and Conditions | Tailwatch' }],
  }),
  component: TermsPage,
})

const EFFECTIVE_DATE = 'March 5, 2026'

function TermsPage() {
  return (
    <PublicPageShell>
      <PublicHeader />

      <main className='mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-12'>
        <section className='space-y-4'>
          <h1 className='text-foreground text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl'>
            Terms and Conditions
          </h1>
          <p className='text-muted-foreground max-w-3xl text-base leading-7 md:text-lg'>
            These Terms and Conditions govern access to the hosted Tailwatch
            service. If you self-host Tailwatch, your deployment is your
            responsibility.
          </p>
          <p className='text-muted-foreground text-sm'>Effective {EFFECTIVE_DATE}</p>
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
                No abuse, spam, unlawful content, or attempts to disrupt
                Tailwatch.
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
                You retain ownership of your content and grant Tailwatch only
                the rights needed to run the service.
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
                Tailwatch is provided as-is and as-available, without
                warranties.
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
              You are responsible for ensuring your use complies with laws and
              regulations that apply to you.
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
              You are responsible for activity on your account, including API
              keys and device access.
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
                No service abuse, scraping abuse, spam, or denial-of-service
                attempts.
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
              Tailwatch source code is available in this repository under the
              MIT License.
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
              Tailwatch may change over time. Features may evolve, and the
              hosted service may experience outages or maintenance windows.
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
              these terms, respond to abuse, or comply with legal obligations.
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
              consequential damages arising from use of the service.
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
              We may update these terms from time to time. Material changes will
              be reflected by updating the effective date on this page.
            </p>
          </CardContent>
        </Card>
      </main>
      <PublicFooter maxWidthClassName='max-w-5xl' />
    </PublicPageShell>
  )
}
