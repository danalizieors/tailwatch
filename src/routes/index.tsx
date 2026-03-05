import { createFileRoute, Link } from '@tanstack/react-router'
import { Activity, Bell, Monitor, Play, Send } from 'lucide-react'
import { useState } from 'react'
import { LogStream } from '~/components/dashboard/log-stream'
import { PublicFooter } from '~/components/layout/public-footer'
import { PublicHeader } from '~/components/layout/public-header'
import { PublicPageShell } from '~/components/layout/public-page-shell'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { buildPublicPageHead } from '~/lib/seo'
import type { StoredEvent } from '~/lib/types'

interface DemoEventTemplate {
  path: string
  status: 'busy' | 'idle'
  message: string
}

interface DemoNotification {
  id: string
  status: 'busy' | 'idle'
  path: string
  content: string
  at: string
}

const demoEventTemplates: DemoEventTemplate[] = [
  {
    path: 'agents/research/worker-3',
    status: 'busy',
    message: 'collecting source documents',
  },
  {
    path: 'agents/summarizer/final-pass',
    status: 'idle',
    message: 'requires approval for summary tone',
  },
  {
    path: 'agents/research/worker-3',
    status: 'idle',
    message: 'context pack ready for review',
  },
  {
    path: 'agents/evals/nightly',
    status: 'busy',
    message: 'timeout while scoring benchmark batch',
  },
]

const initialEventOffsetsMs = {
  recent: 45 * 1000,
  medium: 18 * 60 * 1000,
  old: 6 * 60 * 60 * 1000 + 12 * 60 * 1000,
}

const landingFlowCards = [
  {
    title: '1. Install PWA',
    detail: 'Install Tailwatch from your browser for an app-like experience.',
    icon: Monitor,
  },
  {
    title: '2. Publish event',
    detail: 'Publish an event with curl to a volume key path.',
    icon: Send,
  },
  {
    title: '3. Watch status',
    detail: 'Watch each path shift between busy and idle in real time.',
    icon: Activity,
  },
  {
    title: '4. Get alerted',
    detail: 'Receive push notifications and take action.',
    icon: Bell,
  },
]

const initialEvents: StoredEvent[] = [
  createDemoEvent({
    id: 'seed-3',
    time: isoTimeAgo(initialEventOffsetsMs.recent),
    path: 'agents/router/session-884',
    status: 'idle',
    content: 'workflow committed and idle',
  }),
  createDemoEvent({
    id: 'seed-2',
    time: isoTimeAgo(initialEventOffsetsMs.medium),
    path: 'agents/router/session-884',
    status: 'busy',
    content: 'human confirmation requested for production write',
  }),
  createDemoEvent({
    id: 'seed-1',
    time: isoTimeAgo(initialEventOffsetsMs.old),
    path: 'agents/router/session-884',
    status: 'busy',
    content: 'dispatching planner + executor',
  }),
]

const initialNotifications: DemoNotification[] = [
  createDemoNotification({
    id: 'note-seed-3',
    status: initialEvents[0]?.status ?? 'idle',
    path: initialEvents[0]?.path ?? 'agents/router/session-884',
    content: initialEvents[0]?.content ?? 'workflow committed and idle',
    time: initialEvents[0]?.time ?? new Date().toISOString(),
  }),
]

const demoLastSeenAt = initialEvents.reduce((latest, event) => {
  const timestamp = new Date(event.time).getTime()
  return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest
}, 0)

export const Route = createFileRoute('/')({
  head: () =>
    buildPublicPageHead({
      title: 'Tailwatch - Stay entailed',
      description: 'Hierarchical event monitor with push notifications',
      path: '/',
      type: 'website',
    }),
  component: TailwatchLandingPage,
})

function TailwatchLandingPage() {
  const [events, setEvents] = useState<StoredEvent[]>(initialEvents)
  const [notifications, setNotifications] = useState<DemoNotification[]>(
    initialNotifications,
  )
  const [templateIndex, setTemplateIndex] = useState(0)

  const handleSendTestData = () => {
    const template = demoEventTemplates[templateIndex % demoEventTemplates.length]
    const timestamp = new Date().toISOString()
    const eventId = `${Date.now()}-${templateIndex}`

    const nextEvent = createDemoEvent({
      id: eventId,
      time: timestamp,
      path: template.path,
      status: template.status,
      content: template.message,
    })

    setEvents((prev) => [nextEvent, ...prev].slice(0, 8))

    const nextNotification = createDemoNotification({
      id: `${eventId}-push`,
      status: template.status,
      path: template.path,
      content: template.message,
      time: timestamp,
    })

    setNotifications((prev) => [nextNotification, ...prev])

    setTemplateIndex((prev) => prev + 1)
  }

  return (
    <PublicPageShell>
      <PublicHeader />

      <main className='relative flex w-full min-w-0 flex-1 flex-col overflow-x-hidden'>
        <div className='pixel-grid opacity-30' />

        <section className='mx-auto grid w-full max-w-7xl gap-10 overflow-x-hidden px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-12 lg:py-16'>
          <div className='border-white/5 flex min-w-0 flex-col justify-start lg:border-r lg:pr-10'>
            <h1 className='mt-6 text-3xl leading-[1.14] font-bold tracking-tight text-balance sm:text-5xl sm:leading-[1.05]'>
              Watch every agent, job, and service.
              <span className='text-primary mt-2 block'>
                Push notifications everywhere.
              </span>
            </h1>

            <p className='mt-5 max-w-xl text-base leading-relaxed text-pretty text-zinc-400 sm:text-lg'>
              Publish events with curl, get push notifications instantly, watch
              paths shift between busy and idle in real time. Tailwatch sits
              between messy logs and complex monitoring - nothing idles
              unnoticed.
            </p>

            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
              <Link
                to='/dashboard/$volumeId'
                params={{ volumeId: 'personal' }}
                className='bg-primary text-primary-foreground shadow-primary/20 inline-flex h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold tracking-tight shadow-lg transition-opacity hover:opacity-90'
              >
                Open Dashboard
              </Link>
            </div>

            <div className='mt-8 hidden lg:block'>
              <CurlIngestSnippet />
            </div>

          </div>

          <Card
            id='live-logs'
            className='relative min-w-0 overflow-hidden border-white/10 bg-zinc-950/65'
          >
            <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent' />
            <div className='flex items-center justify-between gap-3 border-b border-white/5 p-5 sm:p-6'>
              <div>
                <p className='font-mono text-[10px] tracking-wide text-zinc-500'>
                  Local demo (in-memory)
                </p>
                <h2 className='mt-1 text-lg font-semibold tracking-tight'>
                  Events and push notifications
                </h2>
              </div>
              <Button size='sm' onClick={handleSendTestData}>
                <Play className='h-3.5 w-3.5' />
                Send test event
              </Button>
            </div>

            <div className='grid gap-4 p-5 sm:p-6 2xl:grid-cols-[minmax(0,1fr)_15rem]'>
              <div className='min-w-0'>
                <div className='h-[380px]'>
                  <LogStream events={events} lastSeenAt={demoLastSeenAt} />
                </div>
              </div>

              <div className='rounded-xl border border-white/10 bg-black/30 p-3'>
                <div className='mb-3 text-xs font-semibold tracking-wide text-zinc-300'>
                  Push notifications
                </div>

                <div className='scroll-thin h-[240px] space-y-2 overflow-y-scroll [scrollbar-gutter:stable] pr-1'>
                  {notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className='rounded-lg border border-info/25 bg-info/10 p-2.5'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                            notification.status === 'busy'
                              ? 'border-zinc-400/40 bg-zinc-500/15 text-zinc-200'
                              : 'border-primary/40 bg-primary/15 text-primary'
                          }`}
                        >
                          {notification.status}
                        </span>
                        <span className='font-mono text-[10px] text-info/70'>
                          {notification.at}
                        </span>
                      </div>
                      <p className='mt-1 truncate font-mono text-[11px] text-zinc-300'>
                        {notification.path}
                      </p>
                      <p className='mt-1 text-[11px] leading-relaxed text-zinc-300'>
                        {notification.content}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className='order-last lg:hidden'>
            <CurlIngestSnippet />
          </div>
        </section>

        <section className='mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:max-w-6xl lg:pb-16 xl:max-w-5xl'>
          <Card className='overflow-hidden border-white/10 bg-zinc-950/55'>
            <div className='border-b border-white/5 p-5 sm:p-6'>
              <p className='font-mono text-[10px] tracking-wide text-zinc-500'>
                Installable PWA
              </p>
              <h3 className='mt-1 text-lg font-semibold tracking-tight sm:text-xl'>
                Install from your browser, then run the full event flow.
              </h3>
              <p className='mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-zinc-400'>
                Tailwatch runs as a Progressive Web App. Install it from your
                browser, publish events with curl, follow each path as it moves
                between busy and idle, and get push notifications when your
                attention is needed.
              </p>
            </div>

            <div className='grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4'>
              {landingFlowCards.map((step) => {
                const Icon = step.icon

                return (
                  <article
                    key={step.title}
                    className='rounded-xl border border-white/10 bg-black/25 p-4'
                  >
                    <span className='bg-primary/15 text-primary inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10'>
                      <Icon className='h-4 w-4' />
                    </span>
                    <p className='mt-3 text-sm font-semibold tracking-tight text-zinc-100'>
                      {step.title}
                    </p>
                    <p className='mt-1 text-xs leading-relaxed text-zinc-400'>
                      {step.detail}
                    </p>
                  </article>
                )
              })}
            </div>
          </Card>
        </section>
      </main>

      <PublicFooter />
    </PublicPageShell>
  )
}

function createDemoEvent({
  id,
  time,
  path,
  status,
  content,
}: {
  id: string
  time: string
  path: string
  status: 'busy' | 'idle'
  content: string
}): StoredEvent {
  const normalizedPath = path.replace(/^\/+/, '').replace(/\/+/g, '/')
  const segments = normalizedPath.split('/').filter(Boolean)
  return {
    id,
    volume: 'demo',
    path: normalizedPath,
    segments,
    time,
    ingestedAt: time,
    status,
    content,
    entityId: segments[segments.length - 1],
    entityType: 'path',
  }
}

function isoTimeAgo(offsetMs: number) {
  return new Date(Date.now() - offsetMs).toISOString()
}

function createDemoNotification({
  id,
  status,
  path,
  content,
  time,
}: {
  id: string
  status: 'busy' | 'idle'
  path: string
  content: string
  time: string
}): DemoNotification {
  return {
    id,
    status,
    path,
    content,
    at: formatNotificationTime(time),
  }
}

function formatNotificationTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--'
}

function CurlIngestSnippet() {
  return (
    <div className='rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur'>
      <div className='mb-3 text-xs font-semibold tracking-wide text-zinc-300'>
        Publish events with curl
      </div>
      <pre className='text-primary/80 overflow-hidden rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words sm:text-[11px]'>
        <code className='block whitespace-pre-wrap break-words'>{`curl https://tailwatch.dev/api/publish/YOUR_VOLUME_KEY/path \\
   -d 'busy --- example content'`}</code>
      </pre>
    </div>
  )
}
