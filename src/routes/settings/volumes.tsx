import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { Ban, Copy, Check, HardDrive, Loader2, LogIn, Plus, RotateCw, Trash2 } from 'lucide-react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { AppShellHeader } from '~/components/layout/app-shell-header'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { cn, getPathColor } from '~/lib/utils'

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

  const [newVolumeName, setNewVolumeName] = useState('')
  const [busyAction, setBusyAction] = useState<{ type: string; id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
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
      setBusyAction({ type: 'create', id: 'new' })
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

  const handleRotateKey = async (volume: any) => {
    try {
      setBusyAction({ type: 'rotate', id: volume.id })
      setError(null)
      setNotice(null)

      await rotateVolumeKey({ volumeId: volume.id })
      setNotice(`API key rotated for "${volume.name}".`)
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : 'Failed to rotate API key')
    } finally {
      setBusyAction(null)
    }
  }

  const handleDisableKey = async (volume: any) => {
    if (!window.confirm(`Disable API key for volume "${volume.name}"?`)) {
      return
    }

    try {
      setBusyAction({ type: 'disable', id: volume.id })
      setError(null)
      setNotice(null)

      await disableVolumeKey({ volumeId: volume.id })
      setNotice(`API key disabled for "${volume.name}".`)
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'Failed to disable API key')
    } finally {
      setBusyAction(null)
    }
  }

  const handleDeleteVolume = async (volume: any) => {
    if (volume.isDefault) return

    if (!window.confirm(`Delete volume "${volume.name}"? This also deletes all paths and events in that volume.`)) {
      return
    }

    try {
      setBusyAction({ type: 'delete', id: volume.id })
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
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-dvh w-full flex-col md:min-h-dvh">
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
      <div className="flex min-h-dvh w-full flex-col md:min-h-dvh">
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
    <div className="flex min-h-dvh w-full flex-col md:min-h-dvh bg-background">
      <AppShellHeader current="volumes" />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        
        {/* Header and Global Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight text-foreground">
              <HardDrive className="h-6 w-6 text-primary" />
              Volume Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Provision independent volumes to isolate telemetry streams.
            </p>
          </div>

          <div className="w-full sm:w-auto">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newVolumeName}
                onChange={(event) => setNewVolumeName(event.target.value)}
                placeholder="volume-name"
                className="h-9 w-full sm:w-48 bg-card/50"
                disabled={busyAction !== null}
              />
              <Button 
                type="button" 
                onClick={() => void handleCreateVolume()} 
                disabled={busyAction !== null} 
                className="h-9 gap-1.5 font-black uppercase tracking-widest text-xs"
              >
                {busyAction?.type === 'create' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create Volume
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-destructive animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-success animate-in fade-in slide-in-from-top-1">
            {notice}
          </div>
        ) : null}

        {/* Volume List */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {volumes === undefined ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse border-border/40 bg-card/30 h-48" />
            ))
          ) : volumes.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border/60 bg-muted/10 text-muted-foreground">
              <HardDrive className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">No volumes configured</p>
            </div>
          ) : (
            volumes.map((volume: any) => {
              const color = getPathColor(volume.name)
              const isBusy = busyAction?.id === volume.id
              
              return (
                <Card 
                  key={volume.id} 
                  className={cn(
                    "group flex flex-col overflow-hidden border-border/40 bg-card/30 transition-all hover:bg-card/50",
                    isBusy && "opacity-60"
                  )}
                >
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-8 w-1 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex flex-col">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">
                            {volume.name}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {volume.isDefault ? (
                              <Badge variant="success" className="text-[0.625rem] h-4 font-black uppercase tracking-widest px-1">Default</Badge>
                            ) : null}
                            <Badge 
                              variant={volume.key.enabled ? 'outline' : 'warning'} 
                              className="text-[0.625rem] h-4 font-black uppercase tracking-widest px-1 border-primary/20 text-primary"
                            >
                              {volume.key.enabled ? 'Key Active' : 'Key Disabled'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 leading-none ml-1">API Key</Label>
                      <div className="group/key relative flex items-center rounded-lg border border-border/40 bg-background/50 px-3 py-2 font-mono text-xs break-all">
                        <span className={cn("flex-1", !volume.key.enabled && "italic text-zinc-500")}>
                          {volume.key.value || 'No active key'}
                        </span>
                        {volume.key.enabled && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 ml-2 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => copyToClipboard(volume.key.value, volume.id)}
                          >
                            {copiedKey === volume.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-8 rounded-lg px-2 text-xs font-black uppercase tracking-widest gap-2 hover:bg-primary/5 hover:text-primary transition-all active:scale-95"
                        onClick={() => void handleRotateKey(volume)}
                        disabled={busyAction !== null}
                      >
                        {busyAction?.type === 'rotate' && isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                        Rotate
                      </Button>

                      {volume.key.enabled ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-8 rounded-lg px-2 text-xs font-black uppercase tracking-widest gap-2 hover:bg-warning/5 hover:text-warning transition-all active:scale-95"
                          onClick={() => void handleDisableKey(volume)}
                          disabled={busyAction !== null}
                        >
                          {busyAction?.type === 'disable' && isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                          Disable
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-8 rounded-lg px-2 text-xs font-black uppercase tracking-widest gap-2 hover:bg-success/5 hover:text-success transition-all active:scale-95"
                          onClick={() => void handleRotateKey(volume)}
                          disabled={busyAction !== null}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Enable
                        </Button>
                      )}

                      {!volume.isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg px-0 text-zinc-500 hover:bg-destructive/5 hover:text-destructive transition-all active:scale-95"
                          onClick={() => void handleDeleteVolume(volume)}
                          disabled={busyAction !== null}
                        >
                          {busyAction?.type === 'delete' && isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
