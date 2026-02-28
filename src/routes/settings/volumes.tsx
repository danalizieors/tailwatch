import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronLeft, Copy, HardDrive, KeyRound, Loader2, Plus, RefreshCw, RotateCw, Save } from 'lucide-react'
import { z } from 'zod'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { createManagedVolume, fetchManagedVolumes, type ManagedVolumeRecord, renameManagedVolume, updateManagedVolumeKey } from '~/lib/client-api'
import { cn } from '~/lib/utils'

const searchSchema = z.object({
  workspace: z.string().optional(),
})

type VolumeDraft = {
  name: string
}

export const Route = createFileRoute('/settings/volumes')({
  validateSearch: (search) => searchSchema.parse(search),
  component: VolumeSettingsPage,
})

function VolumeSettingsPage() {
  const { workspace } = Route.useSearch()
  const workspaceKey = workspace?.trim() || 'personal'

  const [volumes, setVolumes] = useState<ManagedVolumeRecord[]>([])
  const [volumeDrafts, setVolumeDrafts] = useState<Record<string, VolumeDraft>>({})
  const [newVolumeName, setNewVolumeName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadVolumes = useCallback(
    async (silent = false) => {
      try {
        setError(null)
        if (silent) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }

        const next = await fetchManagedVolumes()
        setVolumes(next)
        setVolumeDrafts((prev) => {
          const merged = { ...prev }
          for (const volume of next) {
            if (!merged[volume.id]) {
              merged[volume.id] = { name: volume.name }
            }
          }
          return merged
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load volumes')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [],
  )

  useEffect(() => {
    void loadVolumes(false)
  }, [loadVolumes])

  const headerLinks = useMemo(() => {
    return [
      { href: workspaceKey === 'personal' ? '/status' : `/${encodeURIComponent(workspaceKey)}/status`, label: 'Back to status' },
      { href: workspaceKey === 'personal' ? '/settings/devices' : `/settings/devices?workspace=${encodeURIComponent(workspaceKey)}`, label: 'Device settings' },
    ]
  }, [workspaceKey])

  const setVolumeDraftName = (volumeId: string, name: string) => {
    setVolumeDrafts((prev) => ({
      ...prev,
      [volumeId]: { name },
    }))
  }

  const handleCreateVolume = async () => {
    try {
      setError(null)
      setNotice(null)
      setBusyId('create-volume')
      await createManagedVolume({ name: newVolumeName })
      setNewVolumeName('')
      setNotice('Volume created.')
      await loadVolumes(true)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create volume')
    } finally {
      setBusyId(null)
    }
  }

  const handleSaveVolume = async (volume: ManagedVolumeRecord) => {
    try {
      setError(null)
      setNotice(null)
      setBusyId(`volume:${volume.id}`)
      const name = volumeDrafts[volume.id]?.name?.trim() || volume.name
      await renameManagedVolume({ volumeId: volume.id, name })
      setNotice('Volume updated.')
      await loadVolumes(true)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update volume')
    } finally {
      setBusyId(null)
    }
  }

  const handleToggleKey = async (volume: ManagedVolumeRecord) => {
    try {
      setError(null)
      setNotice(null)
      setBusyId(`key-toggle:${volume.id}`)
      await updateManagedVolumeKey({
        volumeId: volume.id,
        enabled: !volume.key.enabled,
      })
      setNotice('Key status updated.')
      await loadVolumes(true)
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to toggle key')
    } finally {
      setBusyId(null)
    }
  }

  const handleRotateKey = async (volume: ManagedVolumeRecord) => {
    try {
      setError(null)
      setNotice(null)
      setBusyId(`key-rotate:${volume.id}`)
      await updateManagedVolumeKey({
        volumeId: volume.id,
        rotate: true,
      })
      setNotice('Key rotated.')
      await loadVolumes(true)
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : 'Failed to rotate key')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col gap-4 px-3 py-4 md:px-8 md:py-8">
      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black uppercase tracking-wider">Volumes</CardTitle>
              <CardDescription>Manage your volumes and rotate each volume&apos;s publish key.</CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => void loadVolumes(true)}
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Create volume</p>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={newVolumeName}
                onChange={(event) => setNewVolumeName(event.target.value)}
                className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                placeholder="Volume name"
              />
              <Button className="gap-1.5" onClick={() => void handleCreateVolume()} disabled={busyId === 'create-volume'}>
                {busyId === 'create-volume' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading volumes...
            </div>
          ) : volumes.length === 0 ? (
            <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-4 text-sm text-muted-foreground">No volumes found yet.</div>
          ) : (
            <div className="space-y-3">
              {volumes.map((volume) => {
                const keyValue = volume.key.value.trim()
                const hasKeyValue = keyValue.length > 0

                return (
                  <div key={volume.id} className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">{volume.name}</p>
                        {volume.isDefault ? <Badge variant="success">Default</Badge> : null}
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        value={volumeDrafts[volume.id]?.name ?? volume.name}
                        onChange={(event) => setVolumeDraftName(volume.id, event.target.value)}
                        className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm"
                        placeholder="Volume name"
                        disabled={volume.isDefault}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => void handleSaveVolume(volume)}
                        disabled={volume.isDefault || busyId === `volume:${volume.id}`}
                      >
                        {busyId === `volume:${volume.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                    </div>

                    <div className="rounded-md border border-border/50 bg-background/40 p-2">
                      <div className="mb-2 flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Volume key</p>
                        <Badge variant={volume.key.enabled ? 'success' : 'outline'}>{volume.key.enabled ? 'Enabled' : 'Disabled'}</Badge>
                      </div>
                      <div className="rounded border border-border/50 bg-background px-2 py-1.5 text-xs font-mono break-all">
                        {hasKeyValue ? keyValue : 'No key generated yet'}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => void handleToggleKey(volume)}
                          disabled={busyId === `key-toggle:${volume.id}`}
                        >
                          {busyId === `key-toggle:${volume.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          {volume.key.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => void handleRotateKey(volume)}
                          disabled={busyId === `key-rotate:${volume.id}`}
                        >
                          {busyId === `key-rotate:${volume.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                          {hasKeyValue ? 'Rotate' : 'Generate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => {
                            void navigator.clipboard.writeText(keyValue)
                            setNotice('Key copied to clipboard.')
                          }}
                          disabled={!hasKeyValue}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                      </div>
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
