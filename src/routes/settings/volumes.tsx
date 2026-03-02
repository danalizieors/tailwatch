import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { Ban, HardDrive, Loader2, LogIn, Plus, RotateCw, Trash2 } from 'lucide-react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { AppShellHeader } from '~/components/layout/app-shell-header'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { getVolumeColor } from '~/lib/utils'

export const Route = createFileRoute('/settings/volumes')({
  component: VolumeSettingsPage,
})

type ManagedVolume = {
  id: any
  name: string
  isDefault: boolean
  key: {
    value: string
    enabled: boolean
  }
}

function VolumeSettingsPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const { signIn } = useAuthActions()
  const volumes = useQuery(api.volumes.listManagedVolumes, isAuthenticated ? {} : 'skip') as
    | ManagedVolume[]
    | undefined

  const ensurePersonalVolume = useMutation(api.volumes.ensurePersonalVolume)
  const createVolume = useMutation(api.volumes.createVolume)
  const rotateVolumeKey = useMutation(api.volumes.rotateVolumeKey)
  const disableVolumeKey = useMutation(api.volumes.disableVolumeKey)
  const deleteVolume = useMutation(api.volumes.deleteVolume)

  const [newVolumeName, setNewVolumeName] = useState('')
  const [busyAction, setBusyAction] = useState<'create' | 'rotate' | 'disable' | 'delete' | null>(null)
  const [busyVolumeId, setBusyVolumeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const hasEnsuredPersonalRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      hasEnsuredPersonalRef.current = false
      return
    }

    if (hasEnsuredPersonalRef.current) return
    hasEnsuredPersonalRef.current = true

    void ensurePersonalVolume().catch((ensureError) => {
      setError(ensureError instanceof Error ? ensureError.message : 'Failed to initialize personal volume')
    })
  }, [ensurePersonalVolume, isAuthenticated])

  const handleCreateVolume = async () => {
    const name = newVolumeName.trim()
    if (!name) {
      setError('Volume name is required.')
      return
    }

    try {
      setBusyAction('create')
      setError(null)
      setNotice(null)

      const created = await createVolume({ name })
      setNewVolumeName('')
      setNotice(`Volume "${created.name}" created.`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create volume')
    } finally {
      setBusyAction(null)
    }
  }

  const handleRotateKey = async (volume: ManagedVolume) => {
    const volumeId = String(volume.id)

    try {
      setBusyAction('rotate')
      setBusyVolumeId(volumeId)
      setError(null)
      setNotice(null)

      const key = await rotateVolumeKey({ volumeId: volume.id })
      setNotice(`API key rotated for "${volume.name}". New key: ${key.value}`)
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : 'Failed to rotate API key')
    } finally {
      setBusyAction(null)
      setBusyVolumeId(null)
    }
  }

  const handleDisableKey = async (volume: ManagedVolume) => {
    const volumeId = String(volume.id)

    if (!window.confirm(`Disable API key for volume "${volume.name}"?`)) {
      return
    }

    try {
      setBusyAction('disable')
      setBusyVolumeId(volumeId)
      setError(null)
      setNotice(null)

      await disableVolumeKey({ volumeId: volume.id })
      setNotice(`API key disabled for "${volume.name}".`)
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'Failed to disable API key')
    } finally {
      setBusyAction(null)
      setBusyVolumeId(null)
    }
  }

  const handleDeleteVolume = async (volume: ManagedVolume) => {
    if (volume.isDefault) return
    const volumeId = String(volume.id)

    if (!window.confirm(`Delete volume "${volume.name}"? This also deletes all paths and events in that volume.`)) {
      return
    }

    try {
      setBusyAction('delete')
      setBusyVolumeId(volumeId)
      setError(null)
      setNotice(null)

      const result = await deleteVolume({ volumeId: volume.id })
      setNotice(
        `Volume "${volume.name}" deleted. Removed ${result.deletedPaths} path(s) and ${result.deletedEvents} event(s).`,
      )
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete volume')
    } finally {
      setBusyAction(null)
      setBusyVolumeId(null)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[100svh] w-full flex-col md:min-h-dvh">
        <AppShellHeader current="volumes" />
        <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-10 md:px-8">
          <Card className="w-full border-border/70 bg-card/85 backdrop-blur">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading authentication state...
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[100svh] w-full flex-col md:min-h-dvh">
        <AppShellHeader current="volumes" />
        <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-10 md:px-8">
          <Card className="w-full border-border/70 bg-card/85 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base font-black uppercase tracking-wider">Volume API Key Management</CardTitle>
              <CardDescription>Sign in to manage volumes and API keys.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="button" className="gap-1.5" onClick={() => void signIn('github', { redirectTo: '/settings/volumes' })}>
                <LogIn className="h-3.5 w-3.5" />
                Sign in with GitHub
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100svh] w-full flex-col md:min-h-dvh">
      <AppShellHeader current="volumes" />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 md:px-8 md:py-10">
        <Card className="border-border/70 bg-card/85 backdrop-blur">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-wider">
            <HardDrive className="h-4 w-4 text-primary" />
            Volume API Key Management
          </CardTitle>
          <CardDescription>
            Every volume is shown below with its own API key actions.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-md border border-success/35 bg-success/10 px-3 py-2 text-xs font-medium text-success">
              {notice}
            </div>
          ) : null}

          <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
            <Label htmlFor="volume-name">Create volume</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="volume-name"
                value={newVolumeName}
                onChange={(event) => setNewVolumeName(event.target.value)}
                placeholder="team-a"
                disabled={busyAction !== null}
              />
              <Button type="button" onClick={() => void handleCreateVolume()} disabled={busyAction !== null} className="gap-1.5">
                {busyAction === 'create' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 bg-background/50 p-3">
            <Label>Volumes</Label>
            {volumes === undefined ? (
              <div className="flex h-9 items-center text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Loading volumes...
              </div>
            ) : volumes.length === 0 ? (
              <div className="text-xs text-muted-foreground">No volumes available.</div>
            ) : (
              <div className="space-y-3">
                {volumes.map((volume) => {
                  const volumeColor = getVolumeColor(volume.name)
                  const volumeId = String(volume.id)
                  const isBusy = busyVolumeId === volumeId

                  return (
                    <div
                      key={volumeId}
                      className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3"
                      style={{
                        borderColor: `oklch(from ${volumeColor} 0.56 0.20 h / 0.45)`,
                        backgroundColor: `oklch(from ${volumeColor} 0.17 0.07 h / 0.45)`,
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/15"
                          style={{ backgroundColor: volumeColor }}
                        />
                        <p className="text-sm font-semibold">{volume.name}</p>
                        {volume.isDefault ? <Badge variant="success">Default</Badge> : null}
                        <Badge variant={volume.key.enabled ? 'success' : 'warning'}>
                          {volume.key.enabled ? 'API Key Enabled' : 'API Key Disabled'}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <Label>Current API key</Label>
                        <div className="rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-xs break-all">
                          {volume.key.value || 'No API key (disabled)'}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleRotateKey(volume)}
                          disabled={busyAction !== null}
                          className="gap-1.5"
                        >
                          {busyAction === 'rotate' && isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="h-3.5 w-3.5" />
                          )}
                          Rotate API key
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleDisableKey(volume)}
                          disabled={busyAction !== null || !volume.key.enabled}
                          className="gap-1.5"
                        >
                          {busyAction === 'disable' && isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Ban className="h-3.5 w-3.5" />
                          )}
                          Disable API key
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => void handleDeleteVolume(volume)}
                          disabled={busyAction !== null || volume.isDefault}
                          className="gap-1.5"
                          title={volume.isDefault ? 'Default volume cannot be deleted' : 'Delete this volume'}
                        >
                          {busyAction === 'delete' && isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete volume
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </CardContent>
      </Card>
      </main>
    </div>
  )
}
