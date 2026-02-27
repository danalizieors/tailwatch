import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Bell, BellOff, ChevronLeft, Loader2, Plus, RefreshCw, Save, Target } from 'lucide-react'
import { z } from 'zod'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { createWatcher, fetchWatchers, updateWatcher, type WatcherRecord } from '~/lib/client-api'
import { getClientWatcherKey, NotificationManager } from '~/lib/notifications'
import { cn } from '~/lib/utils'

const searchSchema = z.object({
  workspace: z.string().optional(),
})

type WatcherDraft = {
  name: string
  includePaths: string
  ignorePaths: string
}

export const Route = createFileRoute('/settings/devices')({
  validateSearch: (search) => searchSchema.parse(search),
  component: NotificationDevicesPage,
})

function NotificationDevicesPage() {
  const { workspace } = Route.useSearch()
  const workspaceKey = workspace?.trim() || 'default'
  const currentWatcherKey = getClientWatcherKey()

  const [watchers, setWatchers] = useState<WatcherRecord[]>([])
  const [drafts, setDrafts] = useState<Record<string, WatcherDraft>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [busyWatcherId, setBusyWatcherId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [newWatcherName, setNewWatcherName] = useState('')
  const [newWatcherInclude, setNewWatcherInclude] = useState('/')
  const [newWatcherIgnore, setNewWatcherIgnore] = useState('')

  const loadWatchers = useCallback(
    async (silent = false) => {
      try {
        setError(null)
        if (silent) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }

        const next = await fetchWatchers(workspaceKey, currentWatcherKey)
        setWatchers(next)
        setDrafts((prev) => {
          const nextDrafts: Record<string, WatcherDraft> = { ...prev }
          for (const watcher of next) {
            if (!nextDrafts[watcher.id]) {
              nextDrafts[watcher.id] = {
                name: watcher.name,
                includePaths: watcher.includePaths.join('\n') || '/',
                ignorePaths: watcher.ignorePaths.join('\n'),
              }
            }
          }
          return nextDrafts
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load watchers')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [workspaceKey, currentWatcherKey],
  )

  useEffect(() => {
    void loadWatchers(false)
  }, [loadWatchers])

  const headerLinks = useMemo(() => {
    const links = [
      { href: `/${encodeURIComponent(workspaceKey)}`, label: 'Back to logs' },
      { href: workspaceKey === 'default' ? '/status' : `/${encodeURIComponent(workspaceKey)}/status`, label: 'Back to status' },
    ]
    return links
  }, [workspaceKey])

  const onDraftChange = (watcherId: string, patch: Partial<WatcherDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [watcherId]: {
        name: patch.name ?? prev[watcherId]?.name ?? '',
        includePaths: patch.includePaths ?? prev[watcherId]?.includePaths ?? '/',
        ignorePaths: patch.ignorePaths ?? prev[watcherId]?.ignorePaths ?? '',
      },
    }))
  }

  const handleToggleWatcher = async (watcher: WatcherRecord) => {
    try {
      setNotice(null)
      setError(null)
      setBusyWatcherId(watcher.id)

      const isCurrent = watcher.watcherKey === currentWatcherKey
      if (isCurrent) {
        if (watcher.enabled) {
          await NotificationManager.disableBackgroundPush(workspaceKey)
        } else {
          const enabled = await NotificationManager.enableBackgroundPush(workspaceKey)
          if (!enabled) {
            throw new Error(NotificationManager.getLastPushError() ?? 'Failed to enable push for this watcher')
          }
        }
      } else {
        await updateWatcher({
          watcherId: watcher.id,
          watcherKey: currentWatcherKey,
          enabled: !watcher.enabled,
        })
      }

      setNotice(isCurrent ? 'Bell state updated for this watcher.' : 'Watcher state updated.')
      await loadWatchers(true)
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to toggle watcher')
    } finally {
      setBusyWatcherId(null)
    }
  }

  const handleSaveWatcher = async (watcher: WatcherRecord) => {
    const draft = drafts[watcher.id]
    if (!draft) return

    try {
      setNotice(null)
      setError(null)
      setBusyWatcherId(watcher.id)

      await updateWatcher({
        watcherId: watcher.id,
        watcherKey: currentWatcherKey,
        name: draft.name.trim() || watcher.name,
        includePaths: parseRuleList(draft.includePaths, ['/']),
        ignorePaths: parseRuleList(draft.ignorePaths, []),
      })

      setNotice('Watcher rules saved.')
      await loadWatchers(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save watcher')
    } finally {
      setBusyWatcherId(null)
    }
  }

  const handleCreateWatcher = async () => {
    try {
      setNotice(null)
      setError(null)
      setIsCreating(true)

      await createWatcher({
        workspace: workspaceKey,
        watcherKey: currentWatcherKey,
        name: newWatcherName.trim() || undefined,
        includePaths: parseRuleList(newWatcherInclude, ['/']),
        ignorePaths: parseRuleList(newWatcherIgnore, []),
      })

      setNewWatcherName('')
      setNewWatcherInclude('/')
      setNewWatcherIgnore('')
      setNotice('New watcher created.')
      await loadWatchers(true)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create watcher')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col gap-4 px-3 py-4 md:px-8 md:py-8">
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black uppercase tracking-wider">Watchers</CardTitle>
              <CardDescription>
                Manage notification watchers for workspace <span className="font-semibold text-foreground">{workspaceKey}</span>.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => void loadWatchers(true)}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {headerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {link.label}
              </a>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice ? (
            <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          ) : null}

          <div className="rounded-lg border border-border/50 bg-background/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add watcher</p>
            <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_auto]">
              <input
                value={newWatcherName}
                onChange={(event) => setNewWatcherName(event.target.value)}
                className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                placeholder="Watcher name"
              />
              <input
                value={newWatcherInclude}
                onChange={(event) => setNewWatcherInclude(event.target.value)}
                className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm font-mono"
                placeholder="Include paths (newline/comma)"
              />
              <input
                value={newWatcherIgnore}
                onChange={(event) => setNewWatcherIgnore(event.target.value)}
                className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm font-mono"
                placeholder="Ignore paths (newline/comma)"
              />
              <Button className="gap-1.5" onClick={() => void handleCreateWatcher()} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading watchers...
            </div>
          ) : watchers.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-4 text-sm text-muted-foreground">
              No watchers found yet.
            </div>
          ) : (
            <div className="space-y-2">
              {watchers.map((watcher) => {
                const draft = drafts[watcher.id] ?? {
                  name: watcher.name,
                  includePaths: watcher.includePaths.join('\n') || '/',
                  ignorePaths: watcher.ignorePaths.join('\n'),
                }
                const isCurrent = watcher.watcherKey === currentWatcherKey
                const isBusy = busyWatcherId === watcher.id

                return (
                  <div
                    key={watcher.id}
                    className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">{watcher.name}</p>
                        {isCurrent ? <Badge variant="success">This device</Badge> : null}
                        <Badge variant={watcher.enabled ? 'success' : 'outline'}>{watcher.enabled ? 'Enabled' : 'Disabled'}</Badge>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => void handleToggleWatcher(watcher)}
                        disabled={isBusy}
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : watcher.enabled ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                        {watcher.enabled ? 'Disable bell' : 'Enable bell'}
                      </Button>
                    </div>

                    <div className="grid gap-2 md:grid-cols-3">
                      <input
                        value={draft.name}
                        onChange={(event) => onDraftChange(watcher.id, { name: event.target.value })}
                        className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                        placeholder="Watcher name"
                      />
                      <textarea
                        value={draft.includePaths}
                        onChange={(event) => onDraftChange(watcher.id, { includePaths: event.target.value })}
                        className="min-h-[72px] rounded-md border border-border/60 bg-background px-3 py-2 text-xs font-mono"
                        placeholder="Include paths"
                      />
                      <textarea
                        value={draft.ignorePaths}
                        onChange={(event) => onDraftChange(watcher.id, { ignorePaths: event.target.value })}
                        className="min-h-[72px] rounded-md border border-border/60 bg-background px-3 py-2 text-xs font-mono"
                        placeholder="Ignore paths"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate font-mono">{watcher.endpoint ? shortEndpoint(watcher.endpoint) : 'No push subscription yet'}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => void handleSaveWatcher(watcher)}
                        disabled={isBusy}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save rules
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function parseRuleList(input: string, fallback: string[]) {
  const values = input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean)

  if (values.length === 0) {
    return fallback
  }

  return values
}

function shortEndpoint(endpoint: string) {
  if (endpoint.length <= 84) return endpoint
  return `${endpoint.slice(0, 52)}...${endpoint.slice(-24)}`
}
