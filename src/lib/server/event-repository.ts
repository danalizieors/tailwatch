import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import type { DashboardSnapshot, StoredEvent } from '~/lib/types'
import {
  appendEvent as appendLocalEvent,
  getDashboardSnapshot as getLocalDashboardSnapshot,
  getStatusSnapshot as getLocalStatusSnapshot,
  type DashboardFilters,
} from '~/lib/server/event-store'

type BackendMode = 'local' | 'convex'

const convexApi = anyApi as any

function getConvexUrl() {
  const url = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL
  return url?.replace(/\/+$/g, '') || undefined
}

export function getBackendMode(): BackendMode {
  return getConvexUrl() ? 'convex' : 'local'
}

function createConvexClient() {
  const url = getConvexUrl()
  if (!url) {
    throw new Error('Convex is not configured (set CONVEX_URL or VITE_CONVEX_URL)')
  }
  return new ConvexHttpClient(url, { logger: false })
}

function parseConvexStoredEvent(value: any): StoredEvent {
  if (!value || typeof value !== 'object') {
    throw new Error('Convex publish returned an invalid event payload')
  }

  return {
    id: String(value.id ?? value._id ?? ''),
    workspace: String(value.workspace ?? 'default'),
    path: String(value.path ?? value.topicPath ?? ''),
    segments: Array.isArray(value.segments) ? value.segments.map((segment: unknown) => String(segment)) : [],
    type: value.type,
    timestamp: String(value.timestamp ?? new Date().toISOString()),
    ingestedAt: String(value.ingestedAt ?? new Date().toISOString()),
    runId: value.runId ? String(value.runId) : undefined,
    entityId: value.entityId ? String(value.entityId) : undefined,
    entityType: value.entityType ? String(value.entityType) : undefined,
    level: value.level,
    status: value.status ? String(value.status) : undefined,
    content: value.content ? String(value.content) : value.message ? String(value.message) : undefined,
    meta: value.meta,
    metrics: value.metrics,
  }
}

function parseConvexDashboardSnapshot(value: any): DashboardSnapshot {
  if (!value || typeof value !== 'object' || !Array.isArray(value.events) || !Array.isArray(value.entities)) {
    throw new Error('Convex dashboard query returned an invalid payload')
  }
  return value as DashboardSnapshot
}

export async function appendEvent(topicPath: string, payload: unknown): Promise<StoredEvent> {
  if (getBackendMode() === 'local') {
    return appendLocalEvent(topicPath, payload)
  }

  const payloadRecord =
    payload && typeof payload === 'object' ? ({ ...(payload as Record<string, unknown>) } as Record<string, unknown>) : {}
  if (typeof payloadRecord.message === 'string' && typeof payloadRecord.content !== 'string') {
    payloadRecord.content = payloadRecord.message
  }

  const client = createConvexClient()
  const workspace = payloadRecord.workspace as string | undefined

  // Sanitize for Convex publish mutation args
  const convexArgs: Record<string, any> = {
    path: topicPath,
    workspace,
    type: payloadRecord.type,
    timestamp: payloadRecord.timestamp,
    runId: payloadRecord.runId,
    entityId: payloadRecord.entityId,
    entityType: payloadRecord.entityType,
    level: payloadRecord.level,
    status: payloadRecord.status,
    content: payloadRecord.content,
    meta: payloadRecord.meta,
    metrics: payloadRecord.metrics,
  }

  // Remove undefined to avoid sending them as nulls/undefineds if mutation args don't like it
  Object.keys(convexArgs).forEach(key => convexArgs[key] === undefined && delete convexArgs[key])

  try {
    const result = await client.mutation(convexApi.events.publish, convexArgs)
    return parseConvexStoredEvent(result)
  } catch (err) {
    console.error('[EventRepository] Convex publish failed:', err)
    throw err
  }
}

export async function getDashboardSnapshot(filters: DashboardFilters = {}): Promise<DashboardSnapshot> {
  if (getBackendMode() === 'local') {
    return getLocalDashboardSnapshot(filters)
  }

  const client = createConvexClient()
  const args: Record<string, any> = {
    workspace: typeof filters.workspace === 'string' ? filters.workspace : undefined,
    topicPrefix: filters.topicPrefix,
    type: filters.type,
    q: filters.q,
    limit: filters.limit,
  }
  Object.keys(args).forEach(key => (args[key] === undefined || args[key] === null) && delete args[key])

  const result = await client.query(convexApi.events.dashboardSnapshot, args)
  return parseConvexDashboardSnapshot(result)
}

export async function getStatusSnapshot(topicPrefix?: string, workspace?: string): Promise<DashboardSnapshot> {
  if (getBackendMode() === 'local') {
    return getLocalStatusSnapshot(topicPrefix, workspace)
  }

  const client = createConvexClient()
  const args: Record<string, any> = {
    workspace: typeof workspace === 'string' ? workspace : undefined,
    topicPrefix,
  }
  Object.keys(args).forEach(key => (args[key] === undefined || args[key] === null) && delete args[key])

  const result = await client.query(convexApi.events.statusSnapshot, args)
  return parseConvexDashboardSnapshot(result)
}
