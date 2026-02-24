import { AlertCircle } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import type { EntitySnapshot } from '~/lib/types'
import { formatDateTime, formatDuration, formatRelative } from '~/lib/format'

interface StatusBoardProps {
  rows: EntitySnapshot[]
}

export function StatusBoard({ rows }: StatusBoardProps) {
  return (
    <Card className="border-white/70 bg-white/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle>Status Board</CardTitle>
        <CardDescription>Latest derived state for each tracked entity in the selected topic scope.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border bg-background px-4 py-6 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No tracked entities for this filter.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <div key={row.key} className="rounded-lg border bg-background/90 p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{row.entityId}</div>
                    <div className="text-xs text-muted-foreground">{row.entityType}</div>
                  </div>
                  <Badge variant={statusBadge(row.currentStatus)}>{row.currentStatus}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="font-mono text-muted-foreground">{row.path}</div>
                  <div>Last seen: {formatRelative(row.lastSeenAt)}</div>
                  <div>At: {formatDateTime(row.lastSeenAt)}</div>
                  <div>Event: {row.lastEventType}</div>
                  <div>Run: {row.currentRunId ?? '—'}</div>
                  <div>Active for: {formatDuration(row.activeForMs)}</div>
                  <div className="line-clamp-2 text-muted-foreground">{row.lastError ?? row.lastContent ?? '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function statusBadge(status: EntitySnapshot['currentStatus']) {
  switch (status) {
    case 'working':
      return 'success' as const
    case 'error':
      return 'destructive' as const
    case 'idle':
      return 'warning' as const
    case 'stopped':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}
