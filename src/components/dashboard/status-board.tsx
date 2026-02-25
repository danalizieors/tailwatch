import type { ReactNode } from 'react'
import { AlertCircle, LayoutGrid, Timer, Clock, Info, CheckCircle2 } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card'
import type { EntitySnapshot } from '~/lib/types'
import { formatDuration, formatRelative } from '~/lib/format'
import { cn, getPathColor } from '~/lib/utils'
import { Button } from '~/components/ui/button'

interface StatusBoardProps {
  rows: EntitySnapshot[]
  lastSeenAt: number
  onAcknowledge?: () => void
  headerActions?: ReactNode
}

export function StatusBoard({ rows, lastSeenAt, onAcknowledge, headerActions }: StatusBoardProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="py-3 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-tight">System Registry</h2>
          <span className="text-[10px] font-bold text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded-md ml-1 border border-border/10">
            {rows.length} TRACKED
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onAcknowledge && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 border-primary/20 bg-primary/5 hover:bg-primary/10 text-[9px] font-black uppercase tracking-widest text-primary gap-1.5 px-3 rounded-lg"
              onClick={onAcknowledge}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Acknowledge
            </Button>
          )}
          {headerActions}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto scroll-thin">
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center flex-col gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5 opacity-40" />
            <span className="text-xs font-medium opacity-60">Registry empty</span>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 pb-6 px-1">
            {rows.map((row) => {
              const pathColor = getPathColor(row.path)
              const jewelBg = `oklch(from ${pathColor} 0.16 0.12 h / 0.9)`
              const jewelBorder = `oklch(from ${pathColor} 0.45 0.18 h / 0.5)`
              const jewelText = `oklch(from ${pathColor} 0.98 0.01 h)`
              const isUnread = new Date(row.lastSeenAt).getTime() > lastSeenAt
              
              return (
                <div 
                  key={row.key} 
                  className={cn(
                    "group relative rounded-2xl border-2 p-6 card-hover-effect backdrop-blur-3xl overflow-hidden",
                    isUnread ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]" : ""
                  )}
                  style={{ 
                    backgroundColor: jewelBg,
                    borderColor: isUnread ? undefined : jewelBorder,
                  }}
                >
                  {isUnread && (
                    <div className="absolute top-4 right-4 z-10">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,1)]"></span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex flex-col min-w-0">
                      <span className="text-lg font-black truncate tracking-tight" style={{ color: jewelText }}>
                        {row.entityId}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1 opacity-60" style={{ color: jewelText }}>
                        {row.entityType}
                      </span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-2",
                      statusBadgeColors(row.currentStatus)
                    )}>
                      <span className={cn("h-2 w-2 rounded-full", statusDotColors(row.currentStatus))} />
                      {row.currentStatus}
                    </div>
                  </div>
                  
                  <div className="space-y-3.5 text-[11px] font-semibold">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="opacity-50 uppercase text-[9px] font-black tracking-widest" style={{ color: jewelText }}>Path</span>
                      <span className="font-mono truncate max-w-[160px] opacity-90" style={{ color: jewelText }}>{row.path}</span>
                    </div>
                    <div className="flex justify-between items-center opacity-70">
                      <span className="opacity-50 uppercase text-[9px] font-black tracking-widest" style={{ color: jewelText }}>Last Seen</span>
                      <span style={{ color: jewelText }}>{formatRelative(row.lastSeenAt)}</span>
                    </div>
                    {row.activeForMs !== undefined && (
                      <div className="flex justify-between items-center opacity-70">
                        <span className="opacity-50 uppercase text-[9px] font-black tracking-widest" style={{ color: jewelText }}>Duration</span>
                        <span style={{ color: jewelText }}>{formatDuration(row.activeForMs)}</span>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div 
                        className="rounded-xl p-3.5 text-[11px] leading-relaxed line-clamp-2 font-bold shadow-inner"
                        style={{ 
                          backgroundColor: `oklch(from ${pathColor} 0.12 0.04 h / 0.4)`,
                          color: row.currentStatus === 'error' ? 'var(--destructive)' : `oklch(from ${pathColor} 0.85 0.05 h)`,
                          border: `1px solid oklch(from ${pathColor} 0.25 0.08 h / 0.3)`
                        }}
                      >
                        {row.lastError ?? row.lastContent ?? <span className="italic opacity-30 uppercase tracking-tighter">No Payload</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function statusBorderColor(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'error': return 'border-destructive/20 hover:border-destructive/40'
    case 'idle': return 'border-info/20 hover:border-info/40'
    case 'stopped': return 'border-success/20 hover:border-success/40'
    default: return 'border-border/60'
  }
}

function statusBadgeColors(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'working': return 'bg-muted/50 text-muted-foreground border-border'
    case 'error': return 'bg-destructive/10 text-destructive border-destructive/20 shadow-inner'
    case 'idle': return 'bg-info/10 text-info border-info/20'
    case 'stopped': return 'bg-success/10 text-success border-success/20'
    default: return 'bg-muted/50 text-muted-foreground border-border'
  }
}

function statusDotColors(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'working': return 'bg-muted-foreground opacity-40'
    case 'error': return 'bg-destructive shadow-[0_0_8px_oklch(from_var(--destructive)_l_c_h_/_0.5)]'
    case 'idle': return 'bg-info shadow-[0_0_8px_oklch(from_var(--info)_l_c_h_/_0.5)]'
    case 'stopped': return 'bg-success shadow-[0_0_8px_oklch(from_var(--success)_l_c_h_/_0.5)]'
    default: return 'bg-muted-foreground'
  }
}
