import { AlertCircle, LayoutGrid, Layers, Timer, RefreshCcw } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import type { EntitySnapshot } from '~/lib/types'
import { formatDateTime, formatDuration, formatRelative } from '~/lib/format'
import { cn } from '~/lib/utils'

interface StatusBoardProps {
  rows: EntitySnapshot[]
}

export function StatusBoard({ rows }: StatusBoardProps) {
  return (
    <Card className="flex flex-col flex-1 border-border/40 bg-card/40 backdrop-blur shadow-sm card-hover-effect overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/20 bg-background/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <CardTitle className="font-mono text-lg tracking-tight uppercase tracking-widest">Entity.StatusMatrix</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/20">
            {rows.length} TRACKED_ENTITIES
          </Badge>
        </div>
      </CardHeader>
      
      <div className="flex-1 overflow-y-auto p-6 bg-background/5 scroll-thin min-h-[400px]">
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center flex-col gap-3 text-sm text-muted-foreground font-mono">
            <AlertCircle className="h-6 w-6 opacity-30" />
            <span className="opacity-50 uppercase tracking-widest text-xs">Awaiting entity registrations...</span>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div 
                key={row.key} 
                className={cn(
                  "group relative rounded-xl border p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1",
                  statusBorderColor(row.currentStatus),
                  "bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-md"
                )}
              >
                {/* Status Indicator Bar */}
                <div className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-xl", statusBgColor(row.currentStatus))} />

                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{row.entityId}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <Layers className="h-3 w-3" />
                      {row.entityType}
                    </span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border",
                    statusBadgeColors(row.currentStatus)
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusDotColors(row.currentStatus))} />
                    {row.currentStatus}
                  </div>
                </div>
                
                <div className="space-y-3 text-[11px] font-mono">
                  <div className="flex justify-between items-center text-muted-foreground/60">
                    <span className="flex items-center gap-1.5"><Layers className="h-3 w-3" /> PATH</span>
                    <span className="text-foreground/80 truncate max-w-[140px]" title={row.path}>{row.path}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground/60">
                    <span className="flex items-center gap-1.5"><RefreshCcw className="h-3 w-3" /> UPDATED</span>
                    <span className="text-foreground/80">{formatRelative(row.lastSeenAt)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground/60">
                    <span className="flex items-center gap-1.5"><Timer className="h-3 w-3" /> UPTIME</span>
                    <span className="text-foreground/80">{formatDuration(row.activeForMs)}</span>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-border/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] uppercase tracking-tighter text-muted-foreground/40 font-bold">Latest Snapshot</span>
                      <span className="text-[9px] text-muted-foreground/40 font-bold">{row.lastEventType.toUpperCase()}</span>
                    </div>
                    <div className={cn(
                      "rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed line-clamp-2 border border-border/5 group-hover:border-primary/20 transition-all",
                      row.currentStatus === 'error' ? "text-red-400/90 border-red-500/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.2)]" : "text-muted-foreground/80"
                    )}>
                      {row.lastError ?? row.lastContent ?? <span className="italic opacity-30 text-[10px]">{"<DATA_EMPTY>"}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function statusBorderColor(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'working': return 'border-border/40 group-hover:border-border/80'
    case 'error': return 'border-red-500/30 group-hover:border-red-500/60 shadow-[0_4px_20px_-10px_rgba(239,68,68,0.3)]'
    case 'idle': return 'border-sky-500/30 group-hover:border-sky-500/60'
    case 'stopped': return 'border-emerald-500/30 group-hover:border-emerald-500/60'
    default: return 'border-border/40'
  }
}

function statusBgColor(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'working': return 'bg-muted-foreground/20'
    case 'error': return 'bg-red-500/50'
    case 'idle': return 'bg-sky-500/50'
    case 'stopped': return 'bg-emerald-500/50'
    default: return 'bg-muted-foreground/20'
  }
}

function statusBadgeColors(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'working': return 'bg-secondary/50 text-muted-foreground border-border/40'
    case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20 shadow-inner'
    case 'idle': return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    case 'stopped': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    default: return 'bg-secondary text-muted-foreground border-border'
  }
}

function statusDotColors(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'working': return 'bg-muted-foreground opacity-50'
    case 'error': return 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
    case 'idle': return 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
    case 'stopped': return 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
    default: return 'bg-muted-foreground'
  }
}
