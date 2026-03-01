import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { Ban, HardDrive, Loader2, LogIn, Plus, RotateCw, Trash2 } from 'lucide-react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export const Route = createFileRoute('/settings/volumes')({
  component: VolumeSettingsPage,
})

function VolumeSettingsPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const { signIn } = useAuthActions()
  const volumes = useQuery(api.volumes.listManagedVolumes, isAuthenticated ? {} : 'skip')

  const ensurePersonalVolume = useMutation(api.volumes.ensurePersonalVolume)
  const createVolume = useMutation(api.volumes.createVolume)
  const rotateVolumeKey = useMutation(api.volumes.rotateVolumeKey)
  const disableVolumeKey = useMutation(api.volumes.disableVolumeKey)
  const deleteVolume = useMutation(api.volumes.deleteVolume)

  const [selectedVolumeId, setSelectedVolumeId] = useState('')
  const [newVolumeName, setNewVolumeName] = useState('')
  const [busyAction, setBusyAction] = useState<'create' | 'rotate' | 'disable' | 'delete' | null>(null)
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

  useEffect(() => {
    if (!volumes || volumes.length === 0) {
      setSelectedVolumeId('')
      return
    }

    const stillExists = selectedVolumeId
      ? volumes.some((volume) => String(volume.id) === selectedVolumeId)
      : false

    if (!stillExists) {
      setSelectedVolumeId(String(volumes[0].id))
    }
  }, [volumes, selectedVolumeId])

  const selectedVolume = useMemo(() => {
    if (!volumes || volumes.length === 0) return null
    return volumes.find((volume) => String(volume.id) === selectedVolumeId) ?? null
  }, [volumes, selectedVolumeId])

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
      setSelectedVolumeId(String(created.id))
      setNotice(`Volume "${created.name}" created.`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create volume')
    } finally {
      setBusyAction(null)
    }
  }

  const handleRotateKey = async () => {
    if (!selectedVolume) return

    try {
      setBusyAction('rotate')
      setError(null)
      setNotice(null)

      const key = await rotateVolumeKey({ volumeId: selectedVolume.id })
      setNotice(`API key rotated for "${selectedVolume.name}". New key: ${key.value}`)
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : 'Failed to rotate API key')
    } finally {
      setBusyAction(null)
    }
  }

  const handleDisableKey = async () => {
    if (!selectedVolume) return

    if (!window.confirm(`Disable API key for volume "${selectedVolume.name}"?`)) {
      return
    }

    try {
      setBusyAction('disable')
      setError(null)
      setNotice(null)

      await disableVolumeKey({ volumeId: selectedVolume.id })
      setNotice(`API key disabled for "${selectedVolume.name}".`)
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'Failed to disable API key')
    } finally {
      setBusyAction(null)
    }
  }

  const handleDeleteVolume = async () => {
    if (!selectedVolume || selectedVolume.isDefault) return

    if (!window.confirm(`Delete volume "${selectedVolume.name}"? This also deletes all paths and events in that volume.`)) {
      return
    }

    try {
      setBusyAction('delete')
      setError(null)
      setNotice(null)

      const result = await deleteVolume({ volumeId: selectedVolume.id })
      setNotice(
        `Volume "${selectedVolume.name}" deleted. Removed ${result.deletedPaths} path(s) and ${result.deletedEvents} event(s).`,
      )
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete volume')
    } finally {
      setBusyAction(null)
    }
  }

  if (authLoading) {
    return (
      <main className="mx-auto flex min-h-[100svh] w-full max-w-4xl items-center px-4 py-10 md:min-h-dvh md:px-8">
        <Card className="w-full border-border/70 bg-card/85 backdrop-blur">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading authentication state...
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-[100svh] w-full max-w-4xl items-center px-4 py-10 md:min-h-dvh md:px-8">
        <Card className="w-full border-border/70 bg-card/85 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base font-black uppercase tracking-wider">Volume API Key Management</CardTitle>
            <CardDescription>Sign in to manage volumes and API keys.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" className="gap-1.5" onClick={() => void signIn('github')}>
              <LogIn className="h-3.5 w-3.5" />
              Sign in with GitHub
            </Button>
            <Link to="/" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
              Back to home
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-4xl flex-col gap-4 px-4 py-6 md:min-h-dvh md:px-8 md:py-10">
      <Card className="border-border/70 bg-card/85 backdrop-blur">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-wider">
            <HardDrive className="h-4 w-4 text-primary" />
            Volume API Key Management
          </CardTitle>
          <CardDescription>
            Select a volume, rotate its API key, disable its API key, or delete the volume.
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
            <Label htmlFor="volume-select">Select volume</Label>
            {volumes === undefined ? (
              <div className="flex h-9 items-center text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Loading volumes...
              </div>
            ) : volumes.length === 0 ? (
              <div className="text-xs text-muted-foreground">No volumes available.</div>
            ) : (
              <select
                id="volume-select"
                value={selectedVolumeId}
                onChange={(event) => setSelectedVolumeId(event.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={busyAction !== null}
              >
                {volumes.map((volume) => (
                  <option key={String(volume.id)} value={String(volume.id)}>
                    {volume.name}
                    {volume.isDefault ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedVolume ? (
            <div className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{selectedVolume.name}</p>
                {selectedVolume.isDefault ? <Badge variant="success">Default</Badge> : null}
                <Badge variant={selectedVolume.key.enabled ? 'success' : 'warning'}>
                  {selectedVolume.key.enabled ? 'API Key Enabled' : 'API Key Disabled'}
                </Badge>
              </div>

              <div className="space-y-1">
                <Label>Current API key</Label>
                <div className="rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-xs break-all">
                  {selectedVolume.key.value || 'No API key (disabled)'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleRotateKey()}
                  disabled={busyAction !== null}
                  className="gap-1.5"
                >
                  {busyAction === 'rotate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                  Rotate API key
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDisableKey()}
                  disabled={busyAction !== null || !selectedVolume.key.enabled}
                  className="gap-1.5"
                >
                  {busyAction === 'disable' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  Disable API key
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleDeleteVolume()}
                  disabled={busyAction !== null || selectedVolume.isDefault}
                  className="gap-1.5"
                  title={selectedVolume.isDefault ? 'Default volume cannot be deleted' : 'Delete this volume'}
                >
                  {busyAction === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete volume
                </Button>
              </div>
            </div>
          ) : null}

          <div className="pt-1">
            <Link to="/" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
