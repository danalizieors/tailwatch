import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  Bell,
  Box,
  ChevronRight,
  Cpu,
  GitBranch,
  LayoutGrid,
  ListTree,
  Lock,
  Monitor,
  Smartphone,
  Sparkles,
  Terminal,
  Webhook,
} from 'lucide-react'
import { PublicFooter } from '~/components/layout/public-footer'
import { PublicHeader } from '~/components/layout/public-header'
import { PublicPageShell } from '~/components/layout/public-page-shell'
import { Badge } from '~/components/ui/badge'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: 'Tailwatch - Terminal Telemetry & Instant Alerts' }],
  }),
  component: TailwatchLandingPage,
})

function TailwatchLandingPage() {
  return (
    <PublicPageShell>
      <PublicHeader />

      <main className='relative flex w-full min-w-0 flex-1 flex-col overflow-hidden'>
        {/* Subtle Pixelated Background */}
        <div className='pixel-grid opacity-30' />

        {/* HERO SECTION */}
        <section className='relative px-4 pt-20 pb-24 sm:px-6 md:pt-32 md:pb-40'>
          <div className='mx-auto max-w-5xl'>
            <div className='mb-16 flex flex-col items-center text-center md:mb-24'>
              <Badge
                variant='outline'
                className='border-primary/30 bg-primary/5 text-primary/80 mb-6 rounded-full px-4 py-1 text-[10px] font-medium tracking-widest uppercase'
              >
                <Sparkles className='mr-2 inline-block h-3 w-3 opacity-70' />
                Version 1.0 Signal
              </Badge>
              <h1 className='text-foreground mb-8 text-5xl leading-[0.9] font-bold tracking-tight sm:text-7xl md:text-8xl'>
                The Status Board <br />
                <span className='text-primary glow-text'>for your Agents.</span>
              </h1>
              <p className='mx-auto max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl'>
                Direct-to-dashboard telemetry for your agentic infrastructure.
                Simple ingestion, real-time visualization, and instant alerts.
              </p>

              <div className='mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row'>
                <Link
                  to='/pricing'
                  className='bg-primary shadow-primary/10 flex h-14 w-full items-center justify-center gap-3 rounded-lg px-10 text-sm font-bold text-black shadow-lg transition-all hover:opacity-90 sm:w-auto'
                >
                  Get Started
                  <ArrowRight className='h-4 w-4' />
                </Link>
                <a
                  href='#features'
                  className='flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-10 text-sm font-bold backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto'
                >
                  View Documentation
                </a>
              </div>
            </div>

            {/* THE CORE FLOW EXPLAINER - Cleaner, less "loud" */}
            <div className='relative grid gap-6 lg:grid-cols-3'>
              {/* Step 1: Ingest */}
              <div className='group hover:border-primary/20 relative rounded-xl border border-white/5 bg-zinc-900/40 p-8 backdrop-blur-md transition-all'>
                <div className='mb-8 flex items-center justify-between'>
                  <div className='bg-primary/10 border-primary/20 text-primary flex h-12 w-12 items-center justify-center rounded-2xl border'>
                    <Terminal className='h-5 w-5' />
                  </div>
                  <span className='font-mono text-[10px] font-bold tracking-widest text-zinc-500 uppercase'>
                    01 // INGEST
                  </span>
                </div>
                <div className='space-y-4'>
                  <h3 className='text-xl font-bold tracking-tight'>
                    Zero SDK Ingestion
                  </h3>
                  <p className='text-sm leading-relaxed text-zinc-500'>
                    Just a simple HTTP POST. If your agent can send JSON, it can
                    be monitored.
                  </p>
                  <div className='text-primary/70 overflow-x-auto rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-[11px] leading-relaxed'>
                    <code>
                      curl -X POST
                      http://localhost:3000/api/publish/YOUR_VOLUME_KEY/my-task
                      -H "Content-Type: application/json" -d '&#123;"status":
                      "busy", "content": "Analyzing context..."&#125;'
                    </code>
                  </div>
                </div>
              </div>

              {/* Step 2: Dashboard */}
              <div className='group hover:border-primary/20 relative rounded-xl border border-white/5 bg-zinc-900/40 p-8 backdrop-blur-md transition-all'>
                <div className='mb-8 flex items-center justify-between'>
                  <div className='bg-primary/10 border-primary/20 text-primary flex h-12 w-12 items-center justify-center rounded-2xl border'>
                    <Monitor className='h-5 w-5' />
                  </div>
                  <span className='font-mono text-[10px] font-bold tracking-widest text-zinc-500 uppercase'>
                    02 // WATCH
                  </span>
                </div>
                <div className='space-y-4'>
                  <h3 className='text-xl font-bold tracking-tight'>
                    Live Status Board
                  </h3>
                  <p className='text-sm leading-relaxed text-zinc-500'>
                    Watch state changes live. Know exactly what is busy, idle,
                    or stalled.
                  </p>
                  <div className='space-y-2'>
                    <div className='h-2 w-full overflow-hidden rounded-full bg-white/5'>
                      <div className='bg-primary/60 h-full w-2/3 rounded-full' />
                    </div>
                    <div className='flex justify-between font-mono text-[10px] text-zinc-600 uppercase'>
                      <span>Analyzing Context</span>
                      <span>67% Complete</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Notification */}
              <div className='group hover:border-primary/20 relative rounded-xl border border-white/5 bg-zinc-900/40 p-8 backdrop-blur-md transition-all'>
                <div className='mb-8 flex items-center justify-between'>
                  <div className='bg-primary/10 border-primary/20 text-primary flex h-12 w-12 items-center justify-center rounded-2xl border'>
                    <Smartphone className='h-5 w-5' />
                  </div>
                  <span className='font-mono text-[10px] font-bold tracking-widest text-zinc-500 uppercase'>
                    03 // ALERT
                  </span>
                </div>
                <div className='space-y-4'>
                  <h3 className='text-xl font-bold tracking-tight'>
                    Instant Alerts
                  </h3>
                  <p className='text-sm leading-relaxed text-zinc-500'>
                    Browser push notifications for desktop and mobile. No native
                    app required.
                  </p>
                  <div className='bg-primary/5 border-primary/10 flex items-center gap-4 rounded-xl border p-4'>
                    <Bell className='text-primary h-5 w-5 animate-bounce' />
                    <div className='text-[11px] font-medium'>
                      <p className='text-primary font-bold tracking-tighter uppercase'>
                        New Notification
                      </p>
                      <p className='text-zinc-400'>
                        Agent requires human input
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section
          id='features'
          className='mx-auto w-full max-w-5xl px-4 pb-32 sm:px-6'
        >
          <div className='grid gap-6 md:grid-cols-2'>
            <div className='group flex flex-col justify-between rounded-[2.5rem] border border-white/5 bg-zinc-900/20 p-10 transition-all hover:bg-zinc-900/30'>
              <div>
                <Cpu className='text-primary/50 group-hover:text-primary mb-8 h-10 w-10 transition-colors' />
                <h3 className='mb-4 text-2xl font-bold tracking-tight'>
                  Hierarchical Paths
                </h3>
                <p className='leading-relaxed text-zinc-500'>
                  Namespace events using file-system paths. Organize your
                  telemetry by project, team, or specific agent versioning
                  automatically.
                </p>
              </div>
              <div className='mt-10 font-mono text-xs text-zinc-600'>
                /production/agents/vision/v1
              </div>
            </div>

            <div className='group flex flex-col justify-between rounded-[2.5rem] border border-white/5 bg-zinc-900/20 p-10 transition-all hover:bg-zinc-900/30'>
              <div>
                <Lock className='text-primary/50 group-hover:text-primary mb-8 h-10 w-10 transition-colors' />
                <h3 className='mb-4 text-2xl font-bold tracking-tight'>
                  Isolated Volumes
                </h3>
                <p className='leading-relaxed text-zinc-500'>
                  Cryptographically separate environments. Multi-tenant
                  architecture designed for serious staging and production
                  workflows.
                </p>
              </div>
              <div className='mt-10 font-mono text-xs text-zinc-600'>
                AES-256 Volume Encryption
              </div>
            </div>
          </div>
        </section>

        {/* TECHNICAL DETAILS */}
        <section className='border-t border-white/5 py-24'>
          <div className='mx-auto max-w-5xl px-4 sm:px-6'>
            <div className='grid items-center gap-20 lg:grid-cols-2'>
              <div>
                <h2 className='mb-8 text-4xl font-bold tracking-tight md:text-5xl'>
                  Built for the <br />{' '}
                  <span className='text-primary'>Agentic Era.</span>
                </h2>
                <div className='space-y-8'>
                  <div className='flex gap-6'>
                    <div className='text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xs font-bold'>
                      01
                    </div>
                    <div className='space-y-1'>
                      <h4 className='text-sm font-bold'>
                        Low Latency Streaming
                      </h4>
                      <p className='text-sm text-zinc-500'>
                        Sub-100ms dashboard updates powered by optimized event
                        architecture.
                      </p>
                    </div>
                  </div>
                  <div className='flex gap-6'>
                    <div className='text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xs font-bold'>
                      02
                    </div>
                    <div className='space-y-1'>
                      <h4 className='text-sm font-bold'>PWA Notifications</h4>
                      <p className='text-sm text-zinc-500'>
                        Install on iOS or Android for native background alerts
                        without the app store.
                      </p>
                    </div>
                  </div>
                  <div className='flex gap-6'>
                    <div className='text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xs font-bold'>
                      03
                    </div>
                    <div className='space-y-1'>
                      <h4 className='text-sm font-bold'>Path-Based State</h4>
                      <p className='text-sm text-zinc-500'>
                        State is derived from hierarchy. It's like 'tail -f'
                        with a structured UI.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className='group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-8 font-mono text-[11px] leading-relaxed'>
                <div className='absolute top-4 right-6 text-[9px] tracking-widest text-zinc-600 uppercase'>
                  Live_Stream
                </div>
                <div className='space-y-3'>
                  <div className='flex gap-3'>
                    <span className='text-primary opacity-40'>12:00:01</span>
                    <span className='text-zinc-500'>POST /agents/vision</span>
                  </div>
                  <div className='flex gap-3 border-l border-white/5 pl-4'>
                    <span className='text-amber-500/80'>STATE: BUSY</span>
                    <span className='text-zinc-400'>
                      "Analyzing context..."
                    </span>
                  </div>
                  <div className='h-4' />
                  <div className='flex gap-3'>
                    <span className='text-primary opacity-40'>12:00:14</span>
                    <span className='text-zinc-500'>POST /agents/approver</span>
                  </div>
                  <div className='flex gap-3 border-l border-white/5 pl-4'>
                    <span className='text-info/80'>ACTION_REQUIRED: TRUE</span>
                  </div>
                  <div className='text-primary mt-8 animate-pulse'>_</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CLEAN CTA */}
        <section className='px-4 py-32 sm:px-6'>
          <div className='from-primary/20 border-primary/20 shadow-primary/5 relative mx-auto max-w-4xl overflow-hidden rounded-[3rem] border bg-gradient-to-br to-transparent p-12 text-center shadow-2xl md:p-24'>
            <div className='from-primary/5 absolute top-0 left-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] via-transparent to-transparent' />
            <h2 className='mb-6 text-4xl leading-tight font-bold tracking-tight md:text-6xl'>
              Stop guessing. <br />{' '}
              <span className='text-primary'>Start watching.</span>
            </h2>
            <p className='mx-auto mb-12 max-w-xl text-lg text-zinc-400'>
              Open source telemetry for the agents you build. Standardize your
              visibility today.
            </p>
            <Link
              to='/pricing'
              className='bg-primary shadow-primary/20 inline-flex h-16 items-center justify-center gap-3 rounded-lg px-12 text-sm font-bold text-black shadow-xl transition-all hover:opacity-90'
            >
              Launch Dashboard
              <ArrowRight className='h-4 w-4' />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter leadText='Terminal Telemetry & Instant Alerts // Free Now' />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .glow-text {
          text-shadow: 0 0 30px oklch(var(--primary) / 0.4);
        }
      `,
        }}
      />
    </PublicPageShell>
  )
}
