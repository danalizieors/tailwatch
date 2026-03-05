import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Bell, Play, Terminal } from 'lucide-react'
import { useState } from 'react'
import { PublicFooter } from '~/components/layout/public-footer'
import { PublicHeader } from '~/components/layout/public-header'
import { PublicPageShell } from '~/components/layout/public-page-shell'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { buildPublicPageHead } from '~/lib/seo'

interface DemoEventTemplate {
  path: string
  state: 'busy' | 'done' | 'needs_input' | 'failed'
  message: string
  pushes: number
}

interface DemoEvent extends DemoEventTemplate {
  id: string
  at: string
}

interface DemoNotification {
  id: string
  title: string
  detail: string
  at: string
}

const demoEventTemplates: DemoEventTemplate[] = [
  {
    path: '/agents/research/worker-3',
    state: 'busy',
    message: 'collecting source documents',
    pushes: 0,
  },
  {
    path: '/agents/summarizer/final-pass',
    state: 'needs_input',
    message: 'requires approval for summary tone',
    pushes: 1,
  },
  {
    path: '/agents/research/worker-3',
    state: 'done',
    message: 'context pack ready for review',
    pushes: 1,
  },
  {
    path: '/agents/evals/nightly',
    state: 'failed',
    message: 'timeout while scoring benchmark batch',
    pushes: 1,
  },
]

const initialEvents: DemoEvent[] = [
  {
    id: 'seed-1',
    at: '14:02:11',
    path: '/agents/router/session-884',
    state: 'busy',
    message: 'dispatching planner + executor',
    pushes: 0,
  },
  {
    id: 'seed-2',
    at: '14:02:29',
    path: '/agents/router/session-884',
    state: 'needs_input',
    message: 'human confirmation requested for production write',
    pushes: 1,
  },
  {
    id: 'seed-3',
    at: '14:03:05',
    path: '/agents/router/session-884',
    state: 'done',
    message: 'workflow committed and idle',
    pushes: 0,
  },
]

const initialNotifications: DemoNotification[] = [
  {
    id: 'note-seed-1',
    title: 'Approval Requested',
    detail: 'Router session-884 needs operator confirmation.',
    at: '14:02:30',
  },
]

const stateStyles: Record<DemoEvent['state'], string> = {
  busy: 'bg-warning/15 text-warning',
  done: 'bg-primary/15 text-primary',
  needs_input: 'bg-info/15 text-info',
  failed: 'bg-destructive/15 text-destructive',
}

const stateLabels: Record<DemoEvent['state'], string> = {
  busy: 'busy',
  done: 'done',
  needs_input: 'needs input',
  failed: 'failed',
}

export const Route = createFileRoute('/')({
  head: () =>
    buildPublicPageHead({
      title: 'Tailwatch - Stay entailed',
      description:
        'Track live events, status transitions, and push alerts for agents and background workflows in one place.',
      path: '/',
      type: 'website',
    }),
  component: TailwatchLandingPage,
})

function TailwatchLandingPage() {
  const [events, setEvents] = useState<DemoEvent[]>(initialEvents)
  const [notifications, setNotifications] = useState<DemoNotification[]>(
    initialNotifications,
  )
  const [templateIndex, setTemplateIndex] = useState(0)

  const handleSendTestData = () => {
    const template = demoEventTemplates[templateIndex % demoEventTemplates.length]
    const timestamp = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const eventId = `${Date.now()}-${templateIndex}`

    const nextEvent: DemoEvent = {
      ...template,
      id: eventId,
      at: timestamp,
    }

    setEvents((prev) => [nextEvent, ...prev].slice(0, 8))

    if (template.pushes > 0) {
      const nextNotification: DemoNotification = {
        id: `${eventId}-push`,
        title:
          template.state === 'failed'
            ? 'Agent Failed'
            : template.state === 'needs_input'
              ? 'Action Needed'
              : 'Agent Update',
        detail: `${template.path} • ${template.message}`,
        at: timestamp,
      }

      setNotifications((prev) => [nextNotification, ...prev].slice(0, 4))
    }

    setTemplateIndex((prev) => prev + 1)
  }

  return (
    <PublicPageShell>
      <PublicHeader />

      <main className='relative flex w-full min-w-0 flex-1 overflow-hidden'>
        <div className='pixel-grid opacity-30' />

        <section className='mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-12 lg:py-16'>
          <div className='border-white/5 flex min-w-0 flex-col justify-center lg:border-r lg:pr-10'>
            <Badge
              variant='outline'
              className='border-primary/30 bg-primary/10 text-primary w-fit rounded-full px-4 py-1 text-[10px] tracking-[0.24em] uppercase'
            >
              Split telemetry view
            </Badge>

            <h1 className='mt-6 text-4xl leading-[0.95] font-bold tracking-tight sm:text-5xl xl:text-6xl'>
              Monitor agent work and human decisions in one divided surface.
            </h1>

            <p className='mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg'>
              Left side explains your flow. Right side runs a live stream demo
              with fake events. Use the test button or post directly with curl,
              then see push alerts appear instantly.
            </p>

            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
              <Link
                to='/dashboard/$volumeId'
                params={{ volumeId: 'personal' }}
                className='bg-primary text-primary-foreground shadow-primary/20 inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold tracking-tight shadow-lg transition-opacity hover:opacity-90'
              >
                Open dashboard
                <ArrowRight className='h-4 w-4' />
              </Link>
              <a
                href='#live-logs'
                className='inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 text-sm font-bold tracking-tight transition-colors hover:bg-white/10'
              >
                Jump to stream
              </a>
            </div>

            <div className='mt-8 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur'>
              <div className='mb-3 flex items-center gap-2 text-xs tracking-widest text-zinc-500 uppercase'>
                <Terminal className='text-primary h-3.5 w-3.5' />
                add events with curl
              </div>
              <pre className='text-primary/80 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[11px] leading-relaxed'>
                <code>{`curl -X POST https://tailwatch.app/api/publish/YOUR_VOLUME/agents/router \\
  -H "Content-Type: application/json" \\
  -d '{"status":"busy","content":"collecting source documents"}'`}</code>
              </pre>
            </div>
          </div>

          <Card
            id='live-logs'
            className='relative min-w-0 overflow-hidden border-white/10 bg-zinc-950/65'
          >
            <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent' />
            <div className='flex items-center justify-between gap-3 border-b border-white/5 p-5 sm:p-6'>
              <div>
                <p className='font-mono text-[10px] tracking-[0.22em] text-zinc-500 uppercase'>
                  fake data stream
                </p>
                <h2 className='mt-1 text-lg font-semibold tracking-tight'>
                  logs + push previews
                </h2>
              </div>
              <Button size='sm' onClick={handleSendTestData}>
                <Play className='h-3.5 w-3.5' />
                Send test data
              </Button>
            </div>

            <div className='grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_15rem] sm:p-6'>
              <div className='min-w-0 rounded-xl border border-white/10 bg-black/40'>
                <div className='flex items-center justify-between border-b border-white/5 px-4 py-3'>
                  <p className='text-xs font-semibold tracking-wide text-zinc-300'>
                    Agent events
                  </p>
                  <span className='font-mono text-[10px] tracking-widest text-zinc-500 uppercase'>
                    live
                  </span>
                </div>

                <div className='scroll-thin max-h-[380px] space-y-2 overflow-y-auto p-3'>
                  {events.map((event) => (
                    <article
                      key={event.id}
                      className='rounded-lg border border-white/10 bg-zinc-900/55 p-3'
                    >
                      <div className='mb-2 flex items-center justify-between gap-3'>
                        <span className='font-mono text-[10px] tracking-wider text-zinc-500 uppercase'>
                          {event.at}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase ${stateStyles[event.state]}`}
                        >
                          {stateLabels[event.state]}
                        </span>
                      </div>
                      <p className='truncate font-mono text-[11px] text-zinc-400'>
                        {event.path}
                      </p>
                      <p className='mt-1 text-sm text-zinc-200'>{event.message}</p>
                      {event.pushes > 0 ? (
                        <div className='mt-2 flex items-center gap-1.5 text-[11px] text-info'>
                          <Bell className='h-3 w-3' />
                          push dispatched to subscribed devices
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>

              <div className='rounded-xl border border-white/10 bg-black/30 p-3'>
                <div className='mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-zinc-300'>
                  <Bell className='text-info h-4 w-4' />
                  Push notifications
                </div>

                <div className='space-y-2'>
                  {notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className='rounded-lg border border-info/25 bg-info/10 p-2.5'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <p className='text-[11px] font-semibold text-info'>
                          {notification.title}
                        </p>
                        <span className='font-mono text-[10px] text-info/70'>
                          {notification.at}
                        </span>
                      </div>
                      <p className='mt-1 text-[11px] leading-relaxed text-zinc-300'>
                        {notification.detail}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>
      </main>

      <PublicFooter />
    </PublicPageShell>
  )
}
