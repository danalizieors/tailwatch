import type { DashboardSnapshot, EventStatus, PublishEventPayload, StoredEvent } from '~/lib/types'

export interface DashboardQuery {
  volume?: string
  topicPrefix?: string
  status?: EventStatus | 'all'
  q?: string
  limit?: number
}

export interface DeviceRecord {
  id: string
  volume: string
  deviceKey: string
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
  volume: string
  created?: boolean
}

export interface ResolvePathAliasResult {
  found: boolean
  aliasId?: string
  path?: string
  volume?: string
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
  if (query.q) params.set('q', query.q)
  if (query.limit) params.set('limit', String(query.limit))
  const value = params.toString()
  return value ? `?${value}` : ''
}

export async function fetchDashboardSnapshot(query: DashboardQuery = {}): Promise<DashboardSnapshot> {
  const response = await fetch(`/api/dashboard${toQueryString(query)}`, {
    headers: {
      'x-tailwatch-volume': query.volume || 'personal'
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to load dashboard: ${response.status}`)
  }
  return response.json()
}

export async function fetchStatusSnapshot(topicPrefix?: string, volume?: string): Promise<DashboardSnapshot> {
  const suffix = topicPrefix ? `?topicPrefix=${encodeURIComponent(topicPrefix)}` : ''
  const response = await fetch(`/api/status${suffix}`, {
    headers: {
      'x-tailwatch-volume': volume || 'personal'
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to load status board: ${response.status}`)
  }
  return response.json()
}

export async function publishEvent(path: string, payload: PublishEventPayload, volume?: string): Promise<StoredEvent> {
  const cleanPath = path.replace(/^\/+|\/+$/g, '')
  const response = await fetch(`/api/publish/${cleanPath}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(volume ? { 'x-tailwatch-volume': volume } : {}),
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Publish failed (${response.status})`)
  }
  return response.json()
}

export async function fetchCurrentDevice(input: {
  deviceKey?: string
  deviceName?: string
}): Promise<DeviceRecord> {
  const response = await fetch('/api/devices/current', {
    headers: {
      ...(input.deviceKey ? { 'x-tailwatch-device-key': input.deviceKey } : {}),
      ...(input.deviceName ? { 'x-tailwatch-device-name': input.deviceName } : {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to load current device (${response.status})`)
  }

  const parsed = (await response.json()) as { device?: DeviceRecord }
  if (!parsed.device) {
    throw new Error('Current device payload missing device')
  }
  return parsed.device
}

export async function fetchDevices(deviceKey?: string): Promise<DeviceRecord[]> {
  const response = await fetch('/api/devices', {
    headers: {
      ...(deviceKey ? { 'x-tailwatch-device-key': deviceKey } : {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to load devices (${response.status})`)
  }

  const parsed = (await response.json()) as { devices?: DeviceRecord[] }
  return Array.isArray(parsed.devices) ? parsed.devices : []
}

export async function createDevice(input: {
  deviceKey?: string
  name?: string
  includePaths?: string[]
  ignorePaths?: string[]
}): Promise<DeviceRecord> {
  const response = await fetch('/api/devices', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(input.deviceKey ? { 'x-tailwatch-device-key': input.deviceKey } : {}),
    },
    body: JSON.stringify({
      name: input.name,
      includePaths: input.includePaths,
      ignorePaths: input.ignorePaths,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to create device (${response.status})`)
  }

  const parsed = (await response.json()) as { device?: DeviceRecord }
  if (!parsed.device) {
    throw new Error('Device create response is missing device')
  }
  return parsed.device
}

export async function updateDevice(input: {
  deviceId: string
  deviceKey?: string
  enabled?: boolean
  name?: string
  includePaths?: string[]
  ignorePaths?: string[]
}): Promise<DeviceRecord> {
  const response = await fetch('/api/devices', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(input.deviceKey ? { 'x-tailwatch-device-key': input.deviceKey } : {}),
    },
    body: JSON.stringify({
      deviceId: input.deviceId,
      enabled: input.enabled,
      name: input.name,
      includePaths: input.includePaths,
      ignorePaths: input.ignorePaths,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to update device (${response.status})`)
  }

  const parsed = (await response.json()) as { device?: DeviceRecord }
  if (!parsed.device) {
    throw new Error('Device update response is missing device')
  }
  return parsed.device
}

export async function ensurePathAlias(path: string, volume?: string): Promise<PathAliasRecord> {
  const response = await fetch('/api/path-alias/ensure', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(volume ? { 'x-tailwatch-volume': volume } : {}),
    },
    body: JSON.stringify({ path }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to ensure path alias (${response.status})`)
  }

  const parsed = (await response.json()) as PathAliasRecord
  return parsed
}

export async function resolvePathAlias(aliasId: string, volume?: string): Promise<ResolvePathAliasResult> {
  const response = await fetch(`/api/path-alias/resolve?id=${encodeURIComponent(aliasId)}`, {
    headers: {
      ...(volume ? { 'x-tailwatch-volume': volume } : {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Failed to resolve path alias (${response.status})`)
  }

  const parsed = (await response.json()) as ResolvePathAliasResult
  return parsed
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
