import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Bell, Play, Terminal } from 'lucide-react'
import { useState } from 'react'
import { LogStream } from '~/components/dashboard/log-stream'
import { PublicFooter } from '~/components/layout/public-footer'
import { PublicHeader } from '~/components/layout/public-header'
import { PublicPageShell } from '~/components/layout/public-page-shell'
import { Badge } from '~/components/ui/badge'
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
      description:
        'Track live events, status transitions, and push alerts for agents and background workflows in one place.',
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

    setNotifications((prev) => [nextNotification, ...prev].slice(0, 4))

    setTemplateIndex((prev) => prev + 1)
  }

  return (
    <PublicPageShell>
      <PublicHeader />

      <main className='relative flex w-full min-w-0 flex-1 overflow-hidden'>
        <div className='pixel-grid opacity-30' />

        <section className='mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] xl:gap-12 xl:py-16'>
          <div className='border-white/5 flex min-w-0 flex-col justify-center xl:border-r xl:pr-10'>
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

            <div className='grid gap-4 p-5 sm:p-6 2xl:grid-cols-[minmax(0,1fr)_15rem]'>
              <div className='min-w-0'>
                <div className='h-[380px]'>
                  <LogStream events={events} lastSeenAt={demoLastSeenAt} />
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
