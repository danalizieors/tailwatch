import type { DashboardSnapshot, EventType, PublishEventPayload, StoredEvent } from '~/lib/types'

export interface DashboardQuery {
  topicPrefix?: string
  type?: EventType | 'all'
  q?: string
  limit?: number
}

function toQueryString(query: DashboardQuery) {
  const params = new URLSearchParams()
  if (query.topicPrefix) params.set('topicPrefix', query.topicPrefix)
  if (query.type && query.type !== 'all') params.set('type', query.type)
  if (query.q) params.set('q', query.q)
  if (query.limit) params.set('limit', String(query.limit))
  const value = params.toString()
  return value ? `?${value}` : ''
}

export async function fetchDashboardSnapshot(query: DashboardQuery = {}): Promise<DashboardSnapshot> {
  const response = await fetch(`/api/dashboard${toQueryString(query)}`)
  if (!response.ok) {
    throw new Error(`Failed to load dashboard: ${response.status}`)
  }
  return response.json()
}

export async function fetchStatusSnapshot(topicPrefix?: string): Promise<DashboardSnapshot> {
  const suffix = topicPrefix ? `?topicPrefix=${encodeURIComponent(topicPrefix)}` : ''
  const response = await fetch(`/api/status${suffix}`)
  if (!response.ok) {
    throw new Error(`Failed to load status board: ${response.status}`)
  }
  return response.json()
}

export async function publishEvent(path: string, payload: PublishEventPayload): Promise<StoredEvent> {
  const cleanPath = path.replace(/^\/+|\/+$/g, '')
  const response = await fetch(`/api/publish/${cleanPath}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Publish failed (${response.status})`)
  }
  return response.json()
}
