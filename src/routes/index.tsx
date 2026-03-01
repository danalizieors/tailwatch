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
    label: 'Event Types',
    value: '6',
    detail: 'start, message, stop, error, heartbeat, update',
    icon: Activity,
  },
  {
    label: 'Ingestion',
    value: 'HTTP',
    detail: 'Simple POST endpoint per topic path',
    icon: Webhook,
  },
  {
    label: 'Alerts',
    value: 'Push',
    detail: 'Optional browser push notifications',
    icon: Bell,
  },
]

const problemCards = [
  {
    title: 'Streams lose context',
    description:
      'Events arrive fast, but ownership disappears. You can see output, not where it belongs in the system.',
    icon: ListTree,
  },
  {
    title: 'State drifts silently',
    description:
      'An event says “started”, but nobody can tell what is still running, failed, idle, or stopped right now.',
    icon: Clock3,
  },
  {
    title: 'Failures hide in noise',
    description:
      'Important errors are mixed with normal chatter, forcing operators to scan timelines instead of reading state.',
    icon: CircleAlert,
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
    title: 'Stream in realtime',
    description: 'Tailwatch appends and streams events instantly so operators can react as systems change.',
    icon: Zap,
  },
  {
    step: '03',
    title: 'Derive current state',
    description:
      'The dashboard summarizes event sequences into entity snapshots: working, stopped, error, idle, or unknown.',
    icon: LayoutGrid,
  },
  {
    step: '04',
    title: 'Alert when needed',
    description:
      'Enable sound and browser push notifications to react to failures without keeping the dashboard in focus.',
    icon: Bell,
  },
]

const featureCards = [
  {
    title: 'Hierarchical topics',
    description: 'Namespace events by team, project, job, task, or service using URL segments.',
    icon: GitBranch,
  },
  {
    title: 'Realtime timeline',
    description: 'Treat Tailwatch like a lightweight observability console for live activity and message trails.',
    icon: ListTree,
  },
  {
    title: 'State snapshots',
    description: 'See current entity state at a glance with the latest content, run ID, and timestamps.',
    icon: LayoutGrid,
  },
  {
    title: 'Search and filters',
    description: 'Filter by topic, type, run, and content to isolate exactly the event thread you need.',
    icon: Database,
  },
  {
    title: 'Workspace scoping',
    description: 'Separate streams with workspace headers for multi-team or environment-specific monitoring.',
    icon: Lock,
  },
]

const useCases = [
  {
    title: 'Agent orchestration',
    body: 'Track planner, coder, reviewer, and tool runs by topic path and run ID.',
    icon: Sparkles,
  },
  {
    title: 'CI / pipeline jobs',
    body: 'Follow build, test, deploy, and rollback stages without building custom dashboards first.',
    icon: Server,
  },
  {
    title: 'Cron + ops tasks',
    body: 'Monitor scheduled jobs, backup checks, and health routines with simple start/stop/error events.',
    icon: ShieldCheck,
  },
  {
    title: 'App message streams',
    body: 'Use event streams for lightweight app timelines or internal team notifications.',
    icon: Terminal,
  },
]

const faqItems = [
  {
    q: 'Do I need an SDK to send events?',
    a: 'No. Tailwatch uses a plain HTTP POST publish endpoint, so curl, shell scripts, CI runners, and app services can all publish events directly.',
  },
  {
    q: 'Can I use Tailwatch for more than agent tasks?',
    a: 'Yes. The model is generic: jobs, services, pipelines, cron tasks, and simple message feeds all fit the same path-based event pattern.',
  },
  {
    q: 'How does the dashboard stay readable under high event volume?',
    a: 'Tailwatch combines path hierarchy, filtering, and state summaries so operators can quickly isolate what matters without losing realtime context.',
  },
  {
    q: 'Can I separate environments or teams?',
    a: 'Yes. Tailwatch supports workspace scoping and hierarchical topic paths, so you can split production, staging, or team-specific feeds cleanly.',
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
  const { isAuthenticated } = useConvexAuth()

  const handleDashboardNavigation = async (event: MouseEvent) => {
    if (isAuthenticated) return
    event.preventDefault()
    await signIn('github', { redirectTo: '/personal' })
  }

  return (
    <div className="scroll-thin relative flex min-h-[100svh] w-full min-w-0 flex-1 overflow-x-hidden md:min-h-dvh">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-10rem] h-72 w-72 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute right-[-8rem] top-32 h-64 w-64 rounded-full bg-info/6 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full bg-primary/5 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full min-w-0">
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
          <nav
            aria-label="Primary"
            className="mx-auto flex min-h-16 w-full max-w-7xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-2 md:h-16 md:flex-nowrap md:gap-4 md:px-6 md:py-0"
          >
            <div className="group flex min-w-0 shrink items-center gap-3 rounded-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Terminal className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col leading-none">
                <span className="text-sm font-semibold tracking-[0.04em] text-foreground">Tailwatch</span>
                <span className="truncate text-[10px] font-medium tracking-[0.08em] text-muted-foreground">
                  Event Monitor
                </span>
              </div>
            </div>

            <div className="ml-auto flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto">
              <Link
                to="/$volumeId"
                params={{ volumeId: 'personal' }}
                onClick={(event) => void handleDashboardNavigation(event)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/35 bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="hidden sm:inline">Open Dashboard</span>
                <span className="sm:hidden">Open</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </nav>
        </header>

        <main id="top" className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-14 px-4 py-8 md:gap-20 md:px-6 md:py-12">
          <section className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-10">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-border/70 bg-card/70 px-3 py-1 text-[11px] tracking-[0.04em] text-foreground">
                  Realtime event telemetry
                </Badge>
                <Badge variant="outline" className="border-border/70 bg-card/70 px-3 py-1 text-[11px] tracking-[0.04em]">
                  Built for agents, jobs, services
                </Badge>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Overview</p>
                <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  See every agent, job, and service
                  <span className="block text-primary">with realtime operational visibility.</span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  Tailwatch is a lightweight realtime dashboard for hierarchical events, tasks, and messages.
                  Publish to a URL path, stream updates instantly, and keep event context and current state in one place.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-card/80 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    <Webhook className="h-3.5 w-3.5 text-primary" />
                    Simple ingestion
                  </div>
                  <p className="text-sm leading-6 text-foreground/90">
                    No SDK required. `curl`, CI jobs, scripts, and apps can publish events over HTTP.
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/80 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" />
                    Operational clarity
                  </div>
                  <p className="text-sm leading-6 text-foreground/90">
                    Path hierarchy + derived entity state makes “what is active now?” visible immediately.
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
                      <p className="text-xs font-medium tracking-[0.04em] text-muted-foreground">Live feed</p>
                      <p className="truncate text-sm font-semibold text-foreground">Workspace `default`</p>
                    </div>
                  </div>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Live
                  </div>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <Card className="min-w-0 border-primary/15 bg-background/60 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-[0.04em] text-primary">
                        <ListTree className="h-3.5 w-3.5" />
                        Event Timeline
                      </CardTitle>
                      <CardDescription className="text-xs">Chronological events with path, type, and payload content.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                        <p className="break-all text-[11px] font-semibold text-foreground">team-a/project-x/task/planner</p>
                        <p className="text-[10px] font-medium text-success">start • run_123</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-card/60 p-2">
                        <p className="break-all text-[11px] font-semibold text-foreground">team-a/project-x/task/planner</p>
                        <p className="text-[10px] font-medium text-muted-foreground">message • "Fetched repository files"</p>
                      </div>
                      <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-2">
                        <p className="break-all text-[11px] font-semibold text-foreground">ops/cron/nightly-backup</p>
                        <p className="text-[10px] font-medium text-destructive">error • disk snapshot timeout</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0 border-info/15 bg-background/60 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-[0.04em] text-info">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        State Snapshot
                      </CardTitle>
                      <CardDescription className="text-xs">Derived state per entity for quick operator decisions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      <div className="rounded-lg border border-success/20 bg-success/10 p-2">
                        <p className="text-[11px] font-semibold text-foreground">planner</p>
                        <p className="text-[10px] font-medium text-success">working • active for 00:23</p>
                      </div>
                      <div className="rounded-lg border border-warning/25 bg-warning/10 p-2">
                        <p className="text-[11px] font-semibold text-foreground">deployer</p>
                        <p className="text-[10px] font-medium text-warning">idle • last seen 2m ago</p>
                      </div>
                      <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-2">
                        <p className="text-[11px] font-semibold text-foreground">nightly-backup</p>
                        <p className="text-[10px] font-medium text-destructive">error • snapshot timeout</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                  <div className="min-w-0 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium tracking-[0.04em] text-muted-foreground">Publish with HTTP</p>
                    <span className="rounded-full border border-border/60 bg-card/70 px-2 py-1 text-[10px] font-medium tracking-[0.04em] text-muted-foreground">
                      No SDK
                    </span>
                  </div>
                  <pre className="w-full max-w-full overflow-x-auto rounded-xl border border-border/60 bg-card/60 p-3 text-[10px] leading-5 text-foreground sm:text-[11px]">
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
                <div key={stat.label} className="rounded-xl border border-border/60 bg-card/80 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-medium tracking-[0.04em] text-muted-foreground">
                      {stat.label}
                    </span>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.detail}</p>
                </div>
              )
            })}
          </section>

          <section id="problem" className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Problem</p>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                When everything emits events, nobody sees the system state.
              </h2>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Tailwatch is designed for the gap between raw event streams and heavyweight observability stacks: realtime operational visibility with a path-based model that is easy to publish into.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {problemCards.map((card) => {
                const Icon = card.icon
                return (
                  <Card key={card.title} className="border-border/70 bg-card/70 shadow-none">
                    <CardHeader>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base font-bold">{card.title}</CardTitle>
                      <CardDescription className="text-sm leading-6">{card.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </section>

          <section id="how-it-works" className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Workflow</p>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                A topic path becomes your monitoring map.
              </h2>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Use hierarchy in the URL itself. Tailwatch stores the stream, organizes it by segments, and derives operator-friendly state from the latest events.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="border-border/70 bg-card/70 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Example hierarchy</CardTitle>
                  <CardDescription>Namespace events with meaningful segments so filtering stays fast and intuitive.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pb-4 font-mono text-xs">
                  {[
                    '/team-a/project-x/task/planner',
                    '/team-a/project-x/task/coder',
                    '/team-a/project-y/pipeline/ingest',
                    '/ops/cron/nightly-backup',
                    '/app/frontend/messages',
                  ].map((path) => (
                    <div
                      key={path}
                      className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-foreground/95"
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
                    <div key={step.step} className="rounded-2xl border border-border/70 bg-card/70 p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs font-semibold tracking-[0.04em] text-primary">{step.step}</span>
                          <p className="text-sm font-semibold text-foreground">{step.title}</p>
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
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Capabilities</p>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                One dashboard, one event source, faster decisions.
              </h2>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Tailwatch keeps ingestion simple and operator workflows practical: monitor event flow, inspect context, and triage what matters now from one screen.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature) => {
                const Icon = feature.icon
                return (
                  <Card key={feature.title} className="border-border/70 bg-card/70 shadow-none">
                    <CardHeader className="pb-3">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base font-bold">{feature.title}</CardTitle>
                      <CardDescription className="text-sm leading-6">{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </section>

          <section className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Use Cases</p>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Built for the workflows teams already have.
              </h2>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Tailwatch works best when you want a practical event dashboard first, not a long instrumentation project.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {useCases.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-2xl border border-border/70 bg-card/70 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  </div>
                )
              })}
            </div>

          </section>

          <section id="faq" className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">FAQ</p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Questions teams ask before they wire it in
              </h2>
            </div>

            <div className="grid gap-3">
              {faqItems.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-border/70 bg-card/70 p-4 open:bg-card/60"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground focus-visible:outline-none">
                    <span>{item.q}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90" />
                  </summary>
                  <p className="pt-3 text-sm leading-6 text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-6 md:p-8">
            <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Get started</p>
                <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Deploy Tailwatch quickly and standardize event visibility.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Open the dashboard from the top navigation and start publishing events immediately with the same endpoint model.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                Single entry point: use the <span className="font-semibold text-foreground">Open Dashboard</span> button in the header.
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-border/40 bg-background/50">
          <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span>Tailwatch</span>
              <span className="text-muted-foreground/60">Realtime event monitor</span>
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
