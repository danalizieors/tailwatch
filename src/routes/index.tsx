import { useAuthActions } from '@convex-dev/auth/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import type { MouseEvent } from 'react'
import {
  Activity,
  ArrowRight,
  Bell,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  GitBranch,
  LayoutGrid,
  ListTree,
  Lock,
  LogIn,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Webhook,
  Zap,
} from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export const Route = createFileRoute('/')({
  component: TailwatchLandingPage,
})

const proofStats = [
  {
    label: 'Experience',
    value: '1',
    detail: 'Unified dashboard',
    icon: LayoutGrid,
  },
  {
    label: 'Status',
    value: 'Busy/Idle',
    detail: 'Binary state machine',
    icon: Activity,
  },
  {
    label: 'Ingestion',
    value: 'HTTP',
    detail: 'Simple POST endpoint',
    icon: Webhook,
  },
  {
    label: 'Alerts',
    value: 'Push',
    detail: 'Desktop & Mobile notifications',
    icon: Bell,
  },
]

const problemCards = [
  {
    title: 'Streams lose context',
    description:
      'Events arrive fast, but ownership disappears. You can see output, but not where it belongs in the system.',
    icon: ListTree,
  },
  {
    title: 'Failures are silent',
    description:
      'Jobs fail in the background and go unnoticed for hours. You need to be alerted the moment a process hits an error.',
    icon: Bell,
  },
  {
    title: 'State drifts away',
    description:
      'An event says “started”, but nobody can tell what is still running, failed, idle, or stopped right now.',
    icon: LayoutGrid,
  },
]

const workflowSteps = [
  {
    step: '01',
    title: 'Publish to a path',
    description: 'Post events to `/api/publish/<topic>` where the URL path becomes the hierarchy Tailwatch tracks.',
    icon: Webhook,
  },
  {
    step: '02',
    title: 'Watch the Log Stream',
    description: 'Tailwatch appends and streams events instantly so you can follow the "chain of thought" in real-time.',
    icon: Zap,
  },
  {
    step: '03',
    title: 'Derive system status',
    description:
      'The Status Board summarizes event sequences into entity snapshots: busy, idle, or error.',
    icon: LayoutGrid,
  },
  {
    step: '04',
    title: 'Alert everywhere',
    description:
      'Enable browser push notifications to receive instant alerts on desktop or mobile when systems change state.',
    icon: Bell,
  },
]

const featureCards = [
  {
    title: 'Hierarchical paths',
    description: 'Namespace events by team, project, or service using a familiar file-system-like hierarchy.',
    icon: GitBranch,
  },
  {
    title: 'Live Log Stream',
    description: 'A real-time timeline for following step-by-step logic, heartbeat signals, and detailed message trails.',
    icon: ListTree,
  },
  {
    title: 'Status Board snapshot',
    description: 'A high-level view of your entire system. Instantly identify stalls and busy components.',
    icon: LayoutGrid,
  },
  {
    title: 'PWA & Mobile Push',
    description: 'Install Tailwatch as a Progressive Web App (PWA) on any device for native-app experience and background alerts.',
    icon: Bell,
  },
  {
    title: 'Isolated Volumes',
    description: 'Separate production, staging, and internal environments with cryptographically secure volumes.',
    icon: Lock,
  },
]

const useCases = [
  {
    title: 'Agent orchestration',
    body: 'Watch an agent’s "chain of thought" and get a push notification when it hits a roadblock.',
    icon: Sparkles,
  },
  {
    title: 'Critical Alerts',
    body: 'Get notified immediately on your phone when a production pipeline fails or a backup stalls.',
    icon: Bell,
  },
  {
    title: 'Cron + ops tasks',
    body: 'Monitor scheduled jobs and health routines with simple status-based events and background alerts.',
    icon: ShieldCheck,
  },
  {
    title: 'Distributed Systems',
    body: 'A lightweight way to see if remote services are still "breathing" across all your devices.',
    icon: Terminal,
  },
]

const faqItems = [
  {
    q: 'Do I need an SDK to receive alerts?',
    a: 'No. Tailwatch uses native browser Web Push. You can enable notifications for any volume with one click on desktop or by installing the PWA on your mobile device.',
  },
  {
    q: 'Can I use Tailwatch for more than agent tasks?',
    a: 'Yes. The model is generic: jobs, services, pipelines, cron tasks, and simple message feeds all fit the same path-based event pattern with integrated alerting.',
  },
  {
    q: 'How does the dashboard stay readable under high event volume?',
    a: 'Tailwatch combines path hierarchy, filtering, and status summaries so you can quickly isolate what matters. Critical state changes will always trigger a push notification if enabled.',
  },
  {
    q: 'How do mobile notifications work?',
    a: 'Tailwatch is a Progressive Web App (PWA). Just "Add to Home Screen" on iOS or Android, and you will receive native background alerts just like a standalone app.',
  },
]

const curlExample = `curl -X POST http://localhost:3000/api/publish/team-a/project-x/task/planner \\
  -H "Content-Type: application/json" \\
  -d '{
    "type":"start",
    "runId":"run_123",
    "entityId":"planner",
    "entityType":"task",
    "content":"Starting plan"
  }'`

function TailwatchLandingPage() {
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading } = useConvexAuth()

  const handleDashboardNavigation = async (event: MouseEvent) => {
    // If we're still loading the auth state, don't do anything yet or block navigation
    if (isLoading) {
      event.preventDefault()
      return
    }

    // If already authenticated, let the Link handle the navigation normally
    if (isAuthenticated) {
      return
    }

    // Otherwise, prevent navigation and start the sign-in flow
    event.preventDefault()
    try {
      await signIn('github', { redirectTo: '/personal' })
    } catch (error) {
      console.error('Failed to initiate sign-in', error)
    }
  }

  return (
    <div className="scroll-thin relative flex min-h-[100svh] w-full min-w-0 flex-1 overflow-x-hidden md:min-h-dvh">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-10rem] h-72 w-72 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute right-[-8rem] top-32 h-64 w-64 rounded-full bg-info/6 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full bg-primary/5 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full min-w-0">
        <header
          className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <nav
            aria-label="Primary"
            className="mx-auto flex min-h-16 w-full max-w-7xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-2 md:h-16 md:flex-nowrap md:gap-4 md:px-6 md:py-0"
          >
            <div className="group flex min-w-0 shrink items-center gap-3 rounded-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-all duration-300 group-hover:shadow-[0_0_15px_-3px_rgba(var(--primary-rgb),0.3)]">
                <Terminal className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col leading-none">
                <span className="text-sm font-black uppercase tracking-tight text-foreground">Tailwatch</span>
                <span className="truncate text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">
                  Event Monitor
                </span>
              </div>
            </div>

            <div className="ml-auto flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto">
              <Link
                to="/$volumeId"
                params={{ volumeId: 'personal' }}
                onClick={(event) => void handleDashboardNavigation(event)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/35 bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition-all duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 shadow-sm shadow-primary/20"
              >
                {!isLoading && !isAuthenticated ? (
                  <>
                    <span className="hidden sm:inline">Sign in with GitHub</span>
                    <span className="sm:hidden">Sign in</span>
                    <LogIn className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Open Dashboard</span>
                    <span className="sm:hidden">Open</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Link>
            </div>
          </nav>
        </header>

        <main id="top" className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-14 px-4 py-8 md:gap-20 md:px-6 md:py-12">
          <section className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-10">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-border/70 bg-card/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-foreground">
                  Realtime event telemetry
                </Badge>
                <Badge variant="outline" className="border-border/70 bg-card/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Built for agents, jobs, services
                </Badge>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Overview</p>
                <h1 className="text-balance text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl uppercase">
                  See every agent, job, and service
                  <span className="block text-primary">with real-time status visibility.</span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  Tailwatch is the sweet spot between messy logs and complex monitoring. 
                  A living Status Board and real-time alerts for your entire agentic workforce.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-card/80 p-4">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    <Webhook className="h-3.5 w-3.5 text-primary" />
                    Zero SDK Ingestion
                  </div>
                  <p className="text-sm leading-6 text-foreground/90">
                    Just a simple HTTP POST. curl, Python, Node, Go—all supported out of the box.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/80 p-4">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    <Bell className="h-3.5 w-3.5 text-primary" />
                    Push Everywhere
                  </div>
                  <p className="text-sm leading-6 text-foreground/90">
                    Cross-platform alerts on Desktop, iOS, and Android via native Web Push.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-w-0">
              <div className="pointer-events-none absolute inset-0 rounded-2xl border border-border/40" />

              <div className="relative min-w-0 space-y-4 rounded-2xl border border-border/60 bg-card/85 p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Live status</p>
                      <p className="truncate text-[11px] font-black uppercase tracking-widest text-foreground">Volume `production`</p>
                    </div>
                  </div>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-success">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Operational
                  </div>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <Card className="min-w-0 border-primary/15 bg-background/60 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                        <ListTree className="h-3.5 w-3.5" />
                        Log Stream
                      </CardTitle>
                      <CardDescription className="text-[10px] font-medium leading-normal">Chronological timeline for "chain of thought" trails.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                        <p className="break-all text-[10px] font-black uppercase tracking-widest text-foreground">agents/vision</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-success">busy • Analyzing frame #420</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                        <p className="break-all text-[10px] font-black uppercase tracking-widest text-foreground">agents/vision</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">message • "Detected 3 objects"</p>
                      </div>
                      <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-2">
                        <p className="break-all text-[10px] font-black uppercase tracking-widest text-foreground">ops/db-backup</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-destructive">error • snapshot timeout</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0 border-info/15 bg-background/60 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-info">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Status Board
                      </CardTitle>
                      <CardDescription className="text-[10px] font-medium leading-normal">High-density snapshot of busy and idle tasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      <div className="rounded-lg border border-success/20 bg-success/10 p-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">vision-agent</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-success">busy • active for 00:23</p>
                      </div>
                      <div className="rounded-lg border border-warning/25 bg-warning/10 p-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">file-ingestor</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-warning">idle • last seen 2m ago</p>
                      </div>
                      <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground">nightly-backup</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-destructive">error • snapshot timeout</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                  <div className="min-w-0 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Publish with HTTP</p>
                    <span className="rounded-full border border-border/60 bg-card/70 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                      No SDK
                    </span>
                  </div>
                  <pre className="w-full max-w-full overflow-x-auto rounded-xl border border-border/60 bg-card/60 p-3 text-[10px] leading-5 text-foreground sm:text-[11px] font-mono">
                    <code>{curlExample}</code>
                  </pre>
                </div>
              </div>
            </div>
          </section>

          <section aria-label="Proof signals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {proofStats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-xl border border-border/60 bg-card/80 p-4 group hover:bg-card transition-colors">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      {stat.label}
                    </span>
                    <Icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-2xl font-black tracking-tight text-foreground uppercase">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.detail}</p>
                </div>
              )
            })}
          </section>

          <section id="problem" className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Problem</p>
              <h2 className="text-balance text-3xl font-black tracking-tight text-foreground md:text-4xl uppercase">
                When everything emits events, nobody sees the status.
              </h2>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Tailwatch is designed for the gap between raw event streams and heavyweight observability stacks: 
                real-time status visibility with a path-based model that makes monitoring feel like a file system.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {problemCards.map((card) => {
                const Icon = card.icon
                return (
                  <Card key={card.title} className="border-border/70 bg-card/70 shadow-none hover:bg-card/80 transition-colors">
                    <CardHeader>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-[13px] font-black uppercase tracking-widest">{card.title}</CardTitle>
                      <CardDescription className="text-sm leading-6">{card.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </section>

          <section id="how-it-works" className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Workflow</p>
              <h2 className="text-balance text-3xl font-black tracking-tight text-foreground md:text-4xl uppercase">
                A topic path becomes your monitoring map.
              </h2>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Use hierarchy in the URL itself. Tailwatch stores the Log Stream, organizes it by segments, and derives operator-friendly status from the latest events.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="border-border/70 bg-card/70 shadow-none">
                <CardHeader>
                  <CardTitle className="text-[13px] font-black uppercase tracking-widest">Example hierarchy</CardTitle>
                  <CardDescription className="text-[10px] font-medium leading-normal">Namespace events with meaningful segments so filtering stays fast and intuitive.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pb-4 font-mono text-[11px]">
                  {[
                    '/production/agents/vision',
                    '/production/agents/planner',
                    '/staging/pipelines/ingest',
                    '/ops/cron/nightly-backup',
                    '/app/frontend/messages',
                  ].map((path) => (
                    <div
                      key={path}
                      className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-foreground/90 font-bold"
                    >
                      {path}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid gap-4">
                {workflowSteps.map((step) => {
                  const Icon = step.icon
                  return (
                    <div key={step.step} className="rounded-2xl border border-border/70 bg-card/70 p-4 hover:bg-card/80 transition-colors">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[10px] font-black uppercase tracking-widest text-primary">{step.step}</span>
                          <p className="text-[11px] font-black uppercase tracking-widest text-foreground">{step.title}</p>
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section id="features" className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Capabilities</p>
              <h2 className="text-balance text-3xl font-black tracking-tight text-foreground md:text-4xl uppercase">
                One dashboard, one event source, faster decisions.
              </h2>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Tailwatch keeps ingestion simple and operator workflows practical: monitor the Log Stream, inspect the Status Board, and triage what matters now from one screen.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature) => {
                const Icon = feature.icon
                return (
                  <Card key={feature.title} className="border-border/70 bg-card/70 shadow-none hover:bg-card/80 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-[13px] font-black uppercase tracking-widest">{feature.title}</CardTitle>
                      <CardDescription className="text-sm leading-6">{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </section>

          <section className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Use Cases</p>
              <h2 className="text-balance text-3xl font-black tracking-tight text-foreground md:text-4xl uppercase">
                Built for the workflows teams already have.
              </h2>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Tailwatch works best when you want a practical status dashboard first, not a long instrumentation project.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {useCases.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-2xl border border-border/70 bg-card/70 p-4 hover:bg-card/80 transition-colors">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-foreground">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  </div>
                )
              })}
            </div>

          </section>

          <section id="faq" className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">FAQ</p>
              <h2 className="text-3xl font-black tracking-tight text-foreground md:text-4xl uppercase">
                Questions teams ask before they wire it in
              </h2>
            </div>

            <div className="grid gap-3">
              {faqItems.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-border/70 bg-card/70 p-4 open:bg-card/60 transition-colors"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black uppercase tracking-tight text-foreground focus-visible:outline-none">
                    <span>{item.q}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90" />
                  </summary>
                  <p className="pt-3 text-sm leading-6 text-muted-foreground font-medium">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-6 md:p-8">
            <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Get started</p>
                <h2 className="text-balance text-3xl font-black tracking-tight text-foreground md:text-4xl uppercase">
                  Deploy Tailwatch quickly and standardize system visibility.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Open the dashboard from the top navigation and start publishing events immediately to your own Volume.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                Single entry point: use the <span className="text-foreground">Open Dashboard</span> button in the header.
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-border/40 bg-background/50">
          <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4 px-4 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="text-foreground/60">Tailwatch</span>
              <span>Realtime event monitor</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span>Open dashboard from the header button.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
