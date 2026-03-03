import { AlertCircle } from 'lucide-react'
import type { EntitySnapshot } from '~/lib/types'
import { formatRelative } from '~/lib/format'
import { cn, getPathColor } from '~/lib/utils'

interface StatusBoardProps {
  rows: EntitySnapshot[]
  lastSeenAt: number
}

export function StatusBoard({ rows, lastSeenAt }: StatusBoardProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center flex-col gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5 opacity-20" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Status Board empty</span>
          </div>
        ) : (
          <div className="grid gap-3 px-1 pb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
            {rows.map((row) => {
              const pathColor = getPathColor(row.path)
              const jewelBg = `oklch(from ${pathColor} 0.16 0.12 h / 0.9)`
              const jewelBorder = `oklch(from ${pathColor} 0.45 0.18 h / 0.5)`
              const jewelText = `oklch(from ${pathColor} 0.98 0.01 h)`
              const jewelTextDim = `oklch(from ${pathColor} 0.65 0.05 h)`
              const isUnread = new Date(row.lastSeenAt).getTime() > lastSeenAt
              
              return (
                <div 
                  key={row.key} 
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border-2 p-4 backdrop-blur-3xl card-hover-effect sm:p-6",
                    isUnread ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]" : ""
                  )}
                  style={{ 
                    backgroundColor: jewelBg,
                    borderColor: isUnread ? undefined : jewelBorder,
                  }}
                >
                  {isUnread && (
                    <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,1)]"></span>
                      </span>
                    </div>
                  )}
                  <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col min-w-0">
                      <span className="text-lg font-black truncate tracking-tight" style={{ color: jewelText }}>
                        {row.entityId}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: jewelTextDim }}>
                        {row.entityType}
                      </span>
                    </div>
                    <div className={cn(
                      "inline-flex w-fit items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest",
                      statusBadgeColors(row.currentStatus)
                    )}>
                      <span className={cn("h-2 w-2 rounded-full", statusDotColors(row.currentStatus))} />
                      {row.currentStatus}
                    </div>
                  </div>
                  
                  <div className="space-y-3.5 text-[11px] font-semibold">
                    <div className="flex flex-col items-start gap-1 border-b border-white/5 pb-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="uppercase text-[10px] font-black tracking-widest" style={{ color: jewelTextDim }}>Path</span>
                      <span className="max-w-full break-all font-mono sm:max-w-[160px] sm:truncate" style={{ color: jewelText }}>{row.path}</span>
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="uppercase text-[10px] font-black tracking-widest" style={{ color: jewelTextDim }}>Last Seen</span>
                      <span className="text-[11px]" style={{ color: jewelText }}>{formatRelative(row.lastSeenAt)}</span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div 
                        className="line-clamp-3 rounded-xl p-3 text-[11px] font-bold leading-relaxed shadow-inner sm:line-clamp-2 sm:p-3.5"
                        style={{ 
                          backgroundColor: `oklch(from ${pathColor} 0.12 0.04 h / 0.4)`,
                          color: row.currentStatus === 'busy' ? 'oklch(0.83 0.12 84)' : `oklch(from ${pathColor} 0.85 0.05 h)`,
                          border: `1px solid oklch(from ${pathColor} 0.25 0.08 h / 0.3)`
                        }}
                      >
                        {row.lastContent ?? <span className="italic uppercase tracking-widest text-[9px] text-zinc-500">No Payload</span>}
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

function statusBadgeColors(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'busy': return 'bg-amber-400/10 text-amber-300 border-amber-400/20 shadow-inner'
    case 'idle': return 'bg-info/10 text-info border-info/20'
    default: return 'bg-muted/50 text-muted-foreground border-border'
  }
}

function statusDotColors(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'busy': return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
    case 'idle': return 'bg-info shadow-[0_0_8px_oklch(from_var(--info)_l_c_h_/_0.5)]'
    default: return 'bg-muted-foreground'
  }
}
