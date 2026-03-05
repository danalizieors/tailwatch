import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { Activity, Bell, Monitor, Play, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LogStream } from '~/components/dashboard/log-stream'
import { PublicFooter } from '~/components/layout/public-footer'
import { PublicHeader } from '~/components/layout/public-header'
import { PublicPageShell } from '~/components/layout/public-page-shell'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import {
  getStoredLastVolumeNameOrDefault,
  resolveManagedVolumeName,
  setStoredLastVolumeName,
} from '~/lib/last-volume'
import { buildPublicPageHead } from '~/lib/seo'
import type { StoredEvent } from '~/lib/types'
import { api } from '../../convex/_generated/api'

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
    detail:
      'Install Tailwatch as a PWA from your browser: use Add to Home Screen for an app-like experience.',
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
      title: 'Tailwatch — Stay entailed',
      description: 'Hierarchical event monitor with push notifications',
      path: '/',
      type: 'website',
    }),
  component: TailwatchLandingPage,
})

function TailwatchLandingPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState<StoredEvent[]>(initialEvents)
  const [notifications, setNotifications] = useState<DemoNotification[]>(
    initialNotifications,
  )
  const [templateIndex, setTemplateIndex] = useState(0)
  const [dashboardVolume, setDashboardVolume] = useState('personal')

  const managedVolumes = useQuery(
    api.volumes.listManagedVolumes,
    isAuthenticated ? {} : 'skip',
  ) as Array<{ name: string; isDefault?: boolean }> | undefined

  useEffect(() => {
    setDashboardVolume(getStoredLastVolumeNameOrDefault())
  }, [])

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return
    if (managedVolumes === undefined) return

    const targetVolume = resolveManagedVolumeName(
      managedVolumes,
      getStoredLastVolumeNameOrDefault(),
    )
    setStoredLastVolumeName(targetVolume)
    void navigate({
      to: '/dashboard/$volumeId',
      params: { volumeId: targetVolume },
      replace: true,
    })
  }, [isAuthLoading, isAuthenticated, managedVolumes, navigate])

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

      <main className='relative flex w-full min-w-0 flex-1 flex-col overflow-x-clip'>
        <div className='pixel-grid opacity-30' />

        <section className='mx-auto grid w-full min-w-0 max-w-6xl gap-10 overflow-x-clip px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,30rem)_minmax(0,44rem)] lg:justify-center lg:gap-12 lg:py-16'>
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
                params={{ volumeId: dashboardVolume }}
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
            className='relative w-full min-w-0 overflow-hidden border-white/10 bg-zinc-950/65'
          >
            <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent' />
            <div className='flex flex-col items-start gap-3 border-b border-white/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
              <div className='min-w-0'>
                <p className='font-mono text-[10px] tracking-wide text-zinc-500'>
                  Local demo (in-memory)
                </p>
                <h2 className='mt-1 text-lg font-semibold tracking-tight'>
                  Events and push notifications
                </h2>
              </div>
              <Button size='sm' className='self-start sm:self-auto' onClick={handleSendTestData}>
                <Play className='h-3.5 w-3.5' />
                Send test event
              </Button>
            </div>

            <div className='grid min-w-0 gap-4 p-5 sm:p-6'>
              <div className='min-w-0'>
                <div className='h-[380px]'>
                  <LogStream events={events} lastSeenAt={demoLastSeenAt} />
                </div>
              </div>

              <div className='min-w-0 rounded-xl border border-white/10 bg-black/30 p-3'>
                <div className='mb-3 text-xs font-semibold tracking-wide text-zinc-300'>
                  Push notifications
                </div>

                <div className='scroll-thin h-[240px] min-w-0 space-y-2 overflow-x-hidden overflow-y-scroll [scrollbar-gutter:stable] pr-1'>
                  {notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className='min-w-0 rounded-lg border border-info/25 bg-info/10 p-2.5'
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
                      <p className='mt-1 break-words text-[11px] leading-relaxed text-zinc-300'>
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

        <section className='mx-auto w-full min-w-0 max-w-6xl px-4 pb-12 sm:px-6 lg:pb-16'>
          <div className='grid justify-items-center gap-5 xl:grid-cols-[minmax(0,42rem)_minmax(0,30rem)] xl:justify-center'>
            <Card className='relative w-full min-w-0 overflow-hidden border-primary/20 bg-gradient-to-br from-zinc-950/85 via-zinc-950/75 to-primary/10'>
              <div className='pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl' />
              <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent' />

              <div className='relative border-b border-white/5 p-5 sm:p-6'>
                <p className='font-mono text-[10px] tracking-wide text-zinc-500'>
                  Installable PWA
                </p>
                <h3 className='mt-1 text-lg font-semibold tracking-tight sm:text-xl'>
                  Install from your browser, then run the full event flow.
                </h3>
                <p className='mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-zinc-300'>
                  Tailwatch runs as a Progressive Web App. Install it from your
                  browser, publish events with curl, follow each path as it
                  moves between busy and idle, and get push notifications when
                  your attention is needed.
                </p>
              </div>

              <ol className='relative grid gap-3 p-5 sm:grid-cols-2 sm:p-6'>
                {landingFlowCards.map((step) => {
                  const Icon = step.icon

                  return (
                    <li
                      key={step.title}
                      className='rounded-xl border border-primary/15 bg-black/35 p-4'
                    >
                      <div className='flex items-start gap-3'>
                        <span className='bg-primary/15 text-primary inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30'>
                          <Icon className='h-4 w-4' />
                        </span>
                        <div>
                          <p className='text-sm font-semibold tracking-tight text-zinc-100'>
                            {step.title}
                          </p>
                          <p className='mt-1 text-xs leading-relaxed text-zinc-300'>
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </Card>

            <Card className='relative w-full min-w-0 max-w-2xl overflow-hidden border-info/25 bg-zinc-950/55 xl:max-w-none'>
              <div className='pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-info/15 to-transparent' />
              <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-info/60 to-transparent' />

              <div className='relative p-5 sm:p-6'>
                <p className='font-mono text-[10px] tracking-wide text-zinc-500'>
                  From the maintainer
                </p>
                <h3 className='mt-1 text-base font-semibold tracking-tight sm:text-lg'>
                  I want Tailwatch to be useful.
                </h3>
                <p className='mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300'>
                  I built Tailwatch because I wanted a more actionable way to
                  see what my agents are doing — in fact, I just wanted to turn
                  my AI agents into microwaves that beep when they're done.
                </p>
                <p className='mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300'>
                  I want it to stay genuinely useful, so the plan is simple:
                  free for as long as I can, always self-hostable, always
                  yours. If paid tiers show up, they're just there to cover
                  infrastructure costs and 1-9 beers — not to squeeze anyone.
                </p>
                <p className='mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300'>
                  Still in early phases — expect rough edges, breaking changes,
                  and the occasional surprise.
                </p>
              </div>

            </Card>
          </div>
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
    <div className='min-w-0 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur'>
      <div className='mb-3 text-xs font-semibold tracking-wide text-zinc-300'>
        Publish events with curl
      </div>
      <pre className='text-primary/80 max-w-full overflow-hidden rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words sm:text-[11px]'>
        <code className='block whitespace-pre-wrap break-all'>{`curl https://tailwatch.dev/api/publish/YOUR_VOLUME_KEY/path \\
   -d 'busy --- example content'`}</code>
      </pre>
    </div>
  )
}
