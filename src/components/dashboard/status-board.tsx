import { AlertCircle, LayoutGrid } from 'lucide-react'
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
    <Card className="flex flex-col h-full border-border/40 bg-card/40 backdrop-blur shadow-sm card-hover-effect">
      <CardHeader className="pb-4 border-b border-border/20 bg-background/20">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <CardTitle className="font-mono text-lg tracking-tight">Entity.StatusMatrix</CardTitle>
        </div>
        <CardDescription className="text-xs">Latest derived state for each tracked entity in the selected scope.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-y-auto min-h-0">
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[20rem] items-center justify-center gap-2 rounded-md border border-border/40 bg-background/30 shadow-inner text-sm text-muted-foreground font-mono">
            <AlertCircle className="h-4 w-4 opacity-50" />
            <span className="opacity-70">No tracked entities matching criteria.</span>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div 
                key={row.key} 
                className={cn(
                  "group relative rounded-xl border p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
                  statusBorderColor(row.currentStatus),
                  "bg-gradient-to-br from-background/80 to-background/40"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-foreground truncate">{row.entityId}</span>
                    <span className="text-xs font-mono text-muted-foreground/70 uppercase tracking-wider">{row.entityType}</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border",
                    statusBadgeColor(row.currentStatus)
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusDotColor(row.currentStatus))} />
                    {row.currentStatus}
                  </div>
                </div>
                
                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between items-baseline border-b border-border/20 pb-1">
                    <span className="text-muted-foreground/60">Path</span>
                    <span className="text-foreground/90 truncate max-w-[140px]" title={row.path}>{row.path}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-border/20 pb-1">
                    <span className="text-muted-foreground/60">Last Seen</span>
                    <span className="text-foreground/90">{formatRelative(row.lastSeenAt)}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-border/20 pb-1">
                    <span className="text-muted-foreground/60">Event</span>
                    <span className="text-foreground/90">{row.lastEventType}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-border/20 pb-1">
                    <span className="text-muted-foreground/60">Duration</span>
                    <span className="text-foreground/90">{formatDuration(row.activeForMs)}</span>
                  </div>
                  
                  <div className="pt-2">
                    <div className="text-muted-foreground/60 mb-1">Latest Content</div>
                    <div className={cn(
                      "rounded-md bg-background/50 p-2 text-[11px] leading-relaxed line-clamp-3",
                      row.currentStatus === 'error' ? "text-red-400 border border-red-500/20" : "text-muted-foreground"
                    )}>
                      {row.lastError ?? row.lastContent ?? <span className="italic opacity-50">{"<empty payload>"}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function statusBorderColor(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'working': return 'border-emerald-500/30 hover:border-emerald-500/50'
    case 'error': return 'border-red-500/30 hover:border-red-500/50'
    case 'idle': return 'border-sky-500/30 hover:border-sky-500/50'
    case 'stopped': return 'border-border/40 hover:border-border/60'
    default: return 'border-border/40'
  }
}

function statusBadgeColor(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'working': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'idle': return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    case 'stopped': return 'bg-secondary/50 text-muted-foreground border-border/40'
    default: return 'bg-secondary text-muted-foreground border-border'
  }
}

function statusDotColor(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'working': return 'bg-emerald-400 animate-pulse'
    case 'error': return 'bg-red-400'
    case 'idle': return 'bg-sky-400'
    case 'stopped': return 'bg-muted-foreground'
    default: return 'bg-muted-foreground'
  }
}
