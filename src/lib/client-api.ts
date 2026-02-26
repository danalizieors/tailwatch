import type { DashboardSnapshot, EventStatus, EventType, PublishEventPayload, StoredEvent } from '~/lib/types'

export interface DashboardQuery {
  workspace?: string
  topicPrefix?: string
  status?: EventStatus | 'all'
  type?: EventType | 'all'
  q?: string
  limit?: number
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
      'x-tailwatch-workspace': query.workspace || 'default'
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
      'x-tailwatch-workspace': workspace || 'default'
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
