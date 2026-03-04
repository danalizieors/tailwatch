import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Activity,
  Bell,
  ChevronRight,
  GitBranch,
  LayoutGrid,
  ListTree,
  Lock,
  Sparkles,
  Terminal,
  Webhook,
  ArrowRight,
  Box,
  Monitor,
  Smartphone,
  Cpu,
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

      <main className="flex-1 w-full min-w-0 flex flex-col relative overflow-hidden">
        {/* Subtle Pixelated Background */}
        <div className="pixel-grid opacity-30" />
        
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-24 md:pt-32 md:pb-40 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center mb-16 md:mb-24">
               <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/5 text-primary/80 px-4 py-1 text-[10px] font-medium tracking-widest uppercase rounded-full">
                <Sparkles className="w-3 h-3 mr-2 inline-block opacity-70" />
                Version 1.0 Signal
              </Badge>
              <h1 className="text-foreground text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-[0.9] mb-8">
                The Status Board <br />
                <span className="text-primary glow-text">for your Agents.</span>
              </h1>
              <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Direct-to-dashboard telemetry for your agentic infrastructure. 
                Simple ingestion, real-time visualization, and instant alerts.
              </p>
              
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                 <Link
                  to="/pricing"
                  className="bg-primary text-black hover:opacity-90 transition-all flex h-14 items-center justify-center gap-3 px-10 text-sm font-bold rounded-lg w-full sm:w-auto shadow-lg shadow-primary/10"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                 <a
                  href="#features"
                  className="bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex h-14 items-center justify-center gap-3 px-10 text-sm font-bold rounded-lg w-full sm:w-auto backdrop-blur-sm"
                >
                  View Documentation
                </a>
              </div>
            </div>

            {/* THE CORE FLOW EXPLAINER - Cleaner, less "loud" */}
            <div className="grid lg:grid-cols-3 gap-6 relative">
              {/* Step 1: Ingest */}
              <div className="relative group p-8 rounded-xl bg-zinc-900/40 border border-white/5 backdrop-blur-md transition-all hover:border-primary/20">
                <div className="mb-8 flex items-center justify-between">
                  <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold tracking-widest uppercase">01 // INGEST</span>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold tracking-tight">Zero SDK Ingestion</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    Just a simple HTTP POST. If your agent can send JSON, it can be monitored.
                  </p>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-primary/70 leading-relaxed overflow-x-auto">
                    <code>curl -X POST http://localhost:3000/api/publish/YOUR_VOLUME_KEY/my-task -H "Content-Type: application/json" -d '&#123;"status": "busy", "content": "Analyzing context..."&#125;'</code>
                  </div>
                </div>
              </div>

              {/* Step 2: Dashboard */}
              <div className="relative group p-8 rounded-xl bg-zinc-900/40 border border-white/5 backdrop-blur-md transition-all hover:border-primary/20">
                <div className="mb-8 flex items-center justify-between">
                  <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold tracking-widest uppercase">02 // WATCH</span>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold tracking-tight">Live Status Board</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    Watch state changes live. Know exactly what is busy, idle, or stalled.
                  </p>
                  <div className="space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div className="h-full w-2/3 rounded-full bg-primary/60" />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono uppercase text-zinc-600">
                      <span>Analyzing Context</span>
                      <span>67% Complete</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Notification */}
              <div className="relative group p-8 rounded-xl bg-zinc-900/40 border border-white/5 backdrop-blur-md transition-all hover:border-primary/20">
                <div className="mb-8 flex items-center justify-between">
                  <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 font-bold tracking-widest uppercase">03 // ALERT</span>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold tracking-tight">Instant Alerts</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    Browser push notifications for desktop and mobile. No native app required.
                  </p>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                    <Bell className="w-5 h-5 text-primary animate-bounce" />
                    <div className="text-[11px] font-medium">
                      <p className="text-primary uppercase tracking-tighter font-bold">New Notification</p>
                      <p className="text-zinc-400">Agent requires human input</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-32">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-10 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 hover:bg-zinc-900/30 transition-all flex flex-col justify-between group">
              <div>
                <Cpu className="w-10 h-10 text-primary/50 mb-8 group-hover:text-primary transition-colors" />
                <h3 className="text-2xl font-bold tracking-tight mb-4">Hierarchical Paths</h3>
                <p className="text-zinc-500 leading-relaxed">
                  Namespace events using file-system paths. Organize your telemetry by project, team, or specific agent versioning automatically.
                </p>
              </div>
              <div className="mt-10 font-mono text-xs text-zinc-600">
                /production/agents/vision/v1
              </div>
            </div>

            <div className="p-10 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 hover:bg-zinc-900/30 transition-all flex flex-col justify-between group">
              <div>
                <Lock className="w-10 h-10 text-primary/50 mb-8 group-hover:text-primary transition-colors" />
                <h3 className="text-2xl font-bold tracking-tight mb-4">Isolated Volumes</h3>
                <p className="text-zinc-500 leading-relaxed">
                  Cryptographically separate environments. Multi-tenant architecture designed for serious staging and production workflows.
                </p>
              </div>
              <div className="mt-10 font-mono text-xs text-zinc-600">
                AES-256 Volume Encryption
              </div>
            </div>
          </div>
        </section>

        {/* TECHNICAL DETAILS */}
        <section className="py-24 border-t border-white/5">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">Built for the <br /> <span className="text-primary">Agentic Era.</span></h2>
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="shrink-0 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-bold text-xs text-primary">01</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm">Low Latency Streaming</h4>
                      <p className="text-zinc-500 text-sm">Sub-100ms dashboard updates powered by optimized event architecture.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="shrink-0 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-bold text-xs text-primary">02</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm">PWA Notifications</h4>
                      <p className="text-zinc-500 text-sm">Install on iOS or Android for native background alerts without the app store.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="shrink-0 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-bold text-xs text-primary">03</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm">Path-Based State</h4>
                      <p className="text-zinc-500 text-sm">State is derived from hierarchy. It's like 'tail -f' with a structured UI.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-black/40 border border-white/10 rounded-xl p-8 font-mono text-[11px] leading-relaxed relative overflow-hidden group">
                <div className="absolute top-4 right-6 text-zinc-600 uppercase tracking-widest text-[9px]">Live_Stream</div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="text-primary opacity-40">12:00:01</span>
                    <span className="text-zinc-500">POST /agents/vision</span>
                  </div>
                  <div className="flex gap-3 pl-4 border-l border-white/5">
                    <span className="text-amber-500/80">STATE: BUSY</span>
                    <span className="text-zinc-400">"Analyzing context..."</span>
                  </div>
                  <div className="h-4" />
                  <div className="flex gap-3">
                    <span className="text-primary opacity-40">12:00:14</span>
                    <span className="text-zinc-500">POST /agents/approver</span>
                  </div>
                  <div className="flex gap-3 pl-4 border-l border-white/5">
                    <span className="text-info/80">ACTION_REQUIRED: TRUE</span>
                  </div>
                  <div className="mt-8 animate-pulse text-primary">_</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CLEAN CTA */}
        <section className="py-32 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center rounded-[3rem] bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 p-12 md:p-24 relative overflow-hidden shadow-2xl shadow-primary/5">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent -z-10" />
             <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">Stop guessing. <br /> <span className="text-primary">Start watching.</span></h2>
             <p className="text-zinc-400 text-lg mb-12 max-w-xl mx-auto">Open source telemetry for the agents you build. Standardize your visibility today.</p>
             <Link
                to="/pricing"
                className="bg-primary text-black hover:opacity-90 transition-all inline-flex h-16 items-center justify-center gap-3 px-12 text-sm font-bold rounded-lg shadow-xl shadow-primary/20"
              >
                Launch Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
          </div>
        </section>

      </main>

      <PublicFooter leadText="Terminal Telemetry & Instant Alerts // Free Now" />

      <style dangerouslySetInnerHTML={{ __html: `
        .glow-text {
          text-shadow: 0 0 30px oklch(var(--primary) / 0.4);
        }
      `}} />
    </PublicPageShell>
  )
}
