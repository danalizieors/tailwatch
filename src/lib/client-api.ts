import type { DashboardSnapshot, EventStatus, EventType, PublishEventPayload, StoredEvent } from '~/lib/types'

export interface DashboardQuery {
  workspace?: string
  topicPrefix?: string
  status?: EventStatus | 'all'
  type?: EventType | 'all'
  q?: string
  limit?: number
}

export interface PushTestResult {
  attempted: number
  delivered: number
  pruned: number
  skipped: boolean
}

export interface PushDeviceRecord {
  endpoint: string
  expirationTime?: number
  p256dh?: string
  auth?: string
  workspace?: string
  userAgent?: string
  updatedAt?: string
  watcherId?: string
  watcherKey?: string
  watcherName?: string
  enabled?: boolean
  includePaths?: string[]
  ignorePaths?: string[]
}

export interface WatcherRecord {
  id: string
  workspace: string
  watcherKey: string
  name: string
  enabled: boolean
  includePaths: string[]
  ignorePaths: string[]
  endpoint?: string
  userAgent?: string
  hasSubscription: boolean
  createdAt: string
  updatedAt: string
  isCurrent?: boolean
}

export interface PathAliasRecord {
  aliasId: string
  path: string
  workspace: string
  created?: boolean
}

export interface ResolvePathAliasResult {
  found: boolean
  aliasId?: string
  path?: string
  workspace?: string
}

export interface VolumeKeyRecord {
  id: string
  volumeId: string
  value: string
  enabled: boolean
}

export interface ManagedVolumeRecord {
  id: string
  name: string
  isDefault: boolean
  key: VolumeKeyRecord
}

function toQueryString(query: DashboardQuery) {
  const params = new URLSearchParams()
  if (query.topicPrefix) params.set('topicPrefix', query.topicPrefix)
  if (query.status && query.status !== 'all') params.set('status', query.status)
  if (query.type && query.type !== 'all') params.set('type', query.type)
  if (query.q) params.set('q', query.q)
  if (query.limit) params.set('limit', String(query.limit))
  const value = params.toString()
  return value ? `?${value}` : ''
}

export async function fetchDashboardSnapshot(query: DashboardQuery = {}): Promise<DashboardSnapshot> {
  const response = await fetch(`/api/dashboard${toQueryString(query)}`, {
    headers: {
      'x-tailwatch-workspace': query.workspace || 'personal'
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to load dashboard: ${response.status}`)
  }
  return response.json()
}

export async function fetchStatusSnapshot(topicPrefix?: string, workspace?: string): Promise<DashboardSnapshot> {
  const suffix = topicPrefix ? `?topicPrefix=${encodeURIComponent(topicPrefix)}` : ''
  const response = await fetch(`/api/status${suffix}`, {
    headers: {
      'x-tailwatch-workspace': workspace || 'personal'
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to load status board: ${response.status}`)
  }
  return response.json()
}

export async function publishEvent(path: string, payload: PublishEventPayload, workspace?: string): Promise<StoredEvent> {
  const cleanPath = path.replace(/^\/+|\/+$/g, '')
  const response = await fetch(`/api/publish/${cleanPath}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(workspace ? { 'x-tailwatch-workspace': workspace } : {}),
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Publish failed (${response.status})`)
  }
  return response.json()
}

export async function triggerPushTest(workspace?: string): Promise<PushTestResult> {
  const response = await fetch('/api/push/test', {
    method: 'POST',
    headers: {
      ...(workspace ? { 'x-tailwatch-workspace': workspace } : {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Push test failed (${response.status})`)
  }

  return response.json()
}

export async function fetchPushDevices(workspace?: string, watcherKey?: string): Promise<PushDeviceRecord[]> {
  const response = await fetch('/api/push/devices', {
    headers: {
      ...(workspace ? { 'x-tailwatch-workspace': workspace } : {}),
      ...(watcherKey ? { 'x-tailwatch-watcher-key': watcherKey } : {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to load linked devices (${response.status})`)
  }

  const parsed = (await response.json()) as { devices?: PushDeviceRecord[] }
  return Array.isArray(parsed.devices) ? parsed.devices : []
}

export async function removePushDevice(input: {
  endpoint?: string
  workspace?: string
  watcherKey?: string
}): Promise<{ ok: boolean; deleted?: number }> {
  const response = await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(input.workspace ? { 'x-tailwatch-workspace': input.workspace } : {}),
    },
    body: JSON.stringify({
      endpoint: input.endpoint,
      watcherKey: input.watcherKey,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to remove linked device (${response.status})`)
  }

  return (await response.json()) as { ok: boolean; deleted?: number }
}

export async function fetchCurrentWatcher(input: {
  workspace?: string
  watcherKey?: string
  watcherName?: string
}): Promise<WatcherRecord> {
  const response = await fetch('/api/watchers/current', {
    headers: {
      ...(input.workspace ? { 'x-tailwatch-workspace': input.workspace } : {}),
      ...(input.watcherKey ? { 'x-tailwatch-watcher-key': input.watcherKey } : {}),
      ...(input.watcherName ? { 'x-tailwatch-watcher-name': input.watcherName } : {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to load current watcher (${response.status})`)
  }

  const parsed = (await response.json()) as { watcher?: WatcherRecord }
  if (!parsed.watcher) {
    throw new Error('Current watcher payload missing watcher')
  }
  return parsed.watcher
}

export async function fetchWatchers(workspace?: string, watcherKey?: string): Promise<WatcherRecord[]> {
  const response = await fetch('/api/watchers', {
    headers: {
      ...(workspace ? { 'x-tailwatch-workspace': workspace } : {}),
      ...(watcherKey ? { 'x-tailwatch-watcher-key': watcherKey } : {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to load watchers (${response.status})`)
  }

  const parsed = (await response.json()) as { watchers?: WatcherRecord[] }
  return Array.isArray(parsed.watchers) ? parsed.watchers : []
}

export async function createWatcher(input: {
  workspace?: string
  watcherKey?: string
  name?: string
  includePaths?: string[]
  ignorePaths?: string[]
}): Promise<WatcherRecord> {
  const response = await fetch('/api/watchers', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(input.workspace ? { 'x-tailwatch-workspace': input.workspace } : {}),
      ...(input.watcherKey ? { 'x-tailwatch-watcher-key': input.watcherKey } : {}),
    },
    body: JSON.stringify({
      name: input.name,
      includePaths: input.includePaths,
      ignorePaths: input.ignorePaths,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to create watcher (${response.status})`)
  }

  const parsed = (await response.json()) as { watcher?: WatcherRecord }
  if (!parsed.watcher) {
    throw new Error('Watcher create response is missing watcher')
  }
  return parsed.watcher
}

export async function updateWatcher(input: {
  watcherId: string
  watcherKey?: string
  enabled?: boolean
  name?: string
  includePaths?: string[]
  ignorePaths?: string[]
}): Promise<WatcherRecord> {
  const response = await fetch('/api/watchers', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(input.watcherKey ? { 'x-tailwatch-watcher-key': input.watcherKey } : {}),
    },
    body: JSON.stringify({
      watcherId: input.watcherId,
      enabled: input.enabled,
      name: input.name,
      includePaths: input.includePaths,
      ignorePaths: input.ignorePaths,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to update watcher (${response.status})`)
  }

  const parsed = (await response.json()) as { watcher?: WatcherRecord }
  if (!parsed.watcher) {
    throw new Error('Watcher update response is missing watcher')
  }
  return parsed.watcher
}

export async function ensurePathAlias(path: string, workspace?: string): Promise<PathAliasRecord> {
  const response = await fetch('/api/path-alias/ensure', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(workspace ? { 'x-tailwatch-workspace': workspace } : {}),
    },
    body: JSON.stringify({ path }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to ensure path alias (${response.status})`)
  }

  return (await response.json()) as PathAliasRecord
}

export async function resolvePathAlias(aliasId: string, workspace?: string): Promise<ResolvePathAliasResult> {
  const response = await fetch(`/api/path-alias/resolve?id=${encodeURIComponent(aliasId)}`, {
    headers: {
      ...(workspace ? { 'x-tailwatch-workspace': workspace } : {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to resolve path alias (${response.status})`)
  }

  return (await response.json()) as ResolvePathAliasResult
}

export async function fetchManagedVolumes(): Promise<ManagedVolumeRecord[]> {
  const response = await fetch('/api/volumes')
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to load volumes (${response.status})`)
  }
  const parsed = (await response.json()) as { volumes?: ManagedVolumeRecord[] }
  return Array.isArray(parsed.volumes) ? parsed.volumes : []
}

export async function createManagedVolume(input: { name: string }): Promise<ManagedVolumeRecord> {
  const response = await fetch('/api/volumes', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: input.name,
    }),
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to create volume (${response.status})`)
  }
  const parsed = (await response.json()) as { volume?: ManagedVolumeRecord }
  if (!parsed.volume) throw new Error('Volume create response is missing volume')
  return parsed.volume
}

export async function renameManagedVolume(input: { volumeId: string; name: string }): Promise<ManagedVolumeRecord> {
  const response = await fetch('/api/volumes', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      volumeId: input.volumeId,
      name: input.name,
    }),
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to rename volume (${response.status})`)
  }
  const parsed = (await response.json()) as { volume?: ManagedVolumeRecord }
  if (!parsed.volume) throw new Error('Volume update response is missing volume')
  return parsed.volume
}

export async function updateManagedVolumeKey(input: {
  volumeId: string
  enabled?: boolean
  rotate?: boolean
}): Promise<VolumeKeyRecord> {
  const response = await fetch('/api/volumes/keys', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      volumeId: input.volumeId,
      enabled: input.enabled,
      rotate: input.rotate,
    }),
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to update volume key (${response.status})`)
  }
  const parsed = (await response.json()) as { key?: VolumeKeyRecord }
  if (!parsed.key) throw new Error('Volume key update response is missing key')
  return parsed.key
}
