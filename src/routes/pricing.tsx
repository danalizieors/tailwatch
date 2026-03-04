import { createFileRoute } from '@tanstack/react-router'
import { Coins, HeartHandshake, Server } from 'lucide-react'
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

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [{ title: 'Pricing | Tailwatch' }],
  }),
  component: PricingPage,
})

function PricingPage() {
  return (
    <PublicPageShell>
      <PublicHeader showPricingLink={false} />

      <main className='mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8 px-4 py-8 md:gap-10 md:px-6 md:py-12'>
        <section className='space-y-5'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge
              variant='outline'
              className='border-border/70 bg-card/70 text-foreground px-3 py-1 text-xs font-semibold tracking-wide'
            >
              Pricing Philosophy
            </Badge>
            <Badge
              variant='outline'
              className='border-border/70 bg-card/70 px-3 py-1 text-xs font-medium tracking-wide text-zinc-400'
            >
              Community-first, sustainable-by-design
            </Badge>
          </div>

          <h1 className='text-foreground text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl'>
            Free now.
            <span className='text-primary block'>Open-source path.</span>
            <span className='text-foreground block'>Self-host welcome.</span>
          </h1>

          <p className='text-muted-foreground max-w-3xl text-base leading-7 md:text-lg'>
            Tailwatch is built for community use first. I want a useful free
            path and a healthy project that can pay for its own infrastructure
            without turning into lock-in.
          </p>
        </section>

        <section>
          <Card className='border-border/70 bg-card/80 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-foreground text-xl font-semibold tracking-tight md:text-2xl'>
                Personal take
              </CardTitle>
              <CardDescription className='text-muted-foreground text-sm leading-6 md:text-base'>
                This is the policy and spirit I am committing to publicly.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4 text-sm leading-7 md:text-base'>
              <p>
                Tailwatch is free right now. I&apos;m building it in public, and
                I plan to open-source it so you can self-host it for free.
              </p>
              <p>
                My goal is to keep the basic experience free and genuinely
                useful for the community. At the same time, I can&apos;t carry
                unlimited infrastructure costs forever, so paid hosted tiers
                will help cover operations and let me keep building this
                sustainably part-time.
              </p>
              <p>
                If you self-host, that&apos;s a win. I&apos;m happy if Tailwatch
                is useful to you either way.
              </p>
              <p>
                Paid plans will focus on convenience and advanced features for
                teams that want less setup and more power, while the free path
                stays practical and community-friendly.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className='grid gap-4 md:grid-cols-3'>
          <Card className='border-border/70 bg-card/70 shadow-none'>
            <CardHeader className='space-y-3'>
              <div className='border-primary/15 bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl border'>
                <HeartHandshake className='h-4 w-4' />
              </div>
              <CardTitle className='text-sm font-semibold tracking-wide'>
                Free should stay useful
              </CardTitle>
              <CardDescription className='text-sm leading-6'>
                The basic workflow should remain a real tool, not a demo trap.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className='border-border/70 bg-card/70 shadow-none'>
            <CardHeader className='space-y-3'>
              <div className='border-info/20 bg-info/10 text-info flex h-10 w-10 items-center justify-center rounded-xl border'>
                <Server className='h-4 w-4' />
              </div>
              <CardTitle className='text-sm font-semibold tracking-wide'>
                Self-hosting is welcome
              </CardTitle>
              <CardDescription className='text-sm leading-6'>
                I care more that you can use Tailwatch than where you run it.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className='border-border/70 bg-card/70 shadow-none'>
            <CardHeader className='space-y-3'>
              <div className='border-warning/30 bg-warning/10 text-warning flex h-10 w-10 items-center justify-center rounded-xl border'>
                <Coins className='h-4 w-4' />
              </div>
              <CardTitle className='text-sm font-semibold tracking-wide'>
                Hosted keeps it sustainable
              </CardTitle>
              <CardDescription className='text-sm leading-6'>
                Paid hosted plans fund infra and make room for consistent
                part-time development.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className='space-y-4'>
          <p className='ml-1 text-xs font-semibold tracking-wide text-zinc-400'>
            What paid likely adds later
          </p>
          <Card className='border-border/70 bg-card/70 shadow-none'>
            <CardContent className='space-y-3 p-5'>
              <p className='text-muted-foreground text-sm leading-6 md:text-base'>
                Hosted convenience, stronger team workflows, and advanced
                features beyond the free basics.
              </p>
              <ul className='text-foreground list-disc space-y-2 pl-5 text-sm leading-6 md:text-base'>
                <li>Advanced alert routing and escalation controls</li>
                <li>Team-oriented collaboration and governance features</li>
                <li>Managed infrastructure for teams that do not want ops</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
      <PublicFooter
        maxWidthClassName='max-w-5xl'
        description='Community-first event monitor'
      />
    </PublicPageShell>
  )
}
