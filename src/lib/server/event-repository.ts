import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import type { DashboardSnapshot, StoredEvent } from '~/lib/types'
import { getProcessEnv } from '~/lib/server/runtime-env'
import {
  appendEvent as appendLocalEvent,
  getDashboardSnapshot as getLocalDashboardSnapshot,
  getStatusSnapshot as getLocalStatusSnapshot,
  type DashboardFilters,
} from '~/lib/server/event-store'

type BackendMode = 'local' | 'convex'

const convexApi = anyApi as any

export interface PushSubscriptionRecord {
  endpoint: string
  expirationTime?: number
  p256dh?: string
  auth?: string
  workspace?: string
  userAgent?: string
  clientVapidPublicKey?: string
  updatedAt?: string
}

export interface UpsertPushSubscriptionResult {
  ok: boolean
  id?: string
  updated?: boolean
  pushConfigured?: boolean
  missingConfig?: string[]
  serverVapidPublicKey?: string
}

function getConvexUrl() {
  const url = import.meta.env.VITE_CONVEX_URL || getProcessEnv('CONVEX_URL') || getProcessEnv('VITE_CONVEX_URL')
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

  const time = String(value.time ?? value.timestamp ?? new Date().toISOString())
  return {
    id: String(value.id ?? value._id ?? ''),
    workspace: String(value.workspace ?? 'default'),
    path: String(value.path ?? value.topicPath ?? ''),
    segments: Array.isArray(value.segments) ? value.segments.map((segment: unknown) => String(segment)) : [],
    time,
    timestamp: time,
    ingestedAt: String(value.ingestedAt ?? new Date().toISOString()),
    status: value.status === 'busy' ? 'busy' : 'idle',
    content: value.content ? String(value.content) : value.message ? String(value.message) : undefined,
    pathId: value.pathId ? String(value.pathId) : undefined,
    submittedPath: value.submittedPath ? String(value.submittedPath) : undefined,
    type: (typeof value.type === 'string' ? value.type : 'status') as any,
    entityId:
      typeof value.entityId === 'string'
        ? value.entityId
        : Array.isArray(value.segments) && value.segments.length > 0
          ? String(value.segments[value.segments.length - 1])
          : String(value.path ?? ''),
    entityType: typeof value.entityType === 'string' ? value.entityType : 'path',
  }
}

function parseConvexDashboardSnapshot(value: any): DashboardSnapshot {
  if (!value || typeof value !== 'object' || !Array.isArray(value.events) || (!Array.isArray(value.paths) && !Array.isArray(value.entities))) {
    throw new Error('Convex dashboard query returned an invalid payload')
  }
  if (!Array.isArray(value.paths) && Array.isArray(value.entities)) {
    value.paths = value.entities
  }
  if (!Array.isArray(value.entities) && Array.isArray(value.paths)) {
    value.entities = value.paths
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
    time: payloadRecord.time,
    timestamp: payloadRecord.timestamp,
    type: payloadRecord.type,
    status: payloadRecord.status,
    content: payloadRecord.content,
    message: payloadRecord.message,
  }

  // Remove undefined to avoid sending them as nulls/undefineds if mutation args don't like it
  Object.keys(convexArgs).forEach(key => convexArgs[key] === undefined && delete convexArgs[key])

  try {
    const result = await client.mutation(convexApi.events.publish, convexArgs)
    const event = parseConvexStoredEvent(result)
    await sendPushNotificationsForEvent({
      workspace: event.workspace,
      path: event.path,
      status: event.status,
      content: event.content,
    }).catch((pushError) => {
      console.warn('[EventRepository] Push fanout failed for published event', {
        path: event.path,
        error: pushError instanceof Error ? pushError.message : String(pushError),
      })
    })
    return event
  } catch (err) {
    console.error('[EventRepository] Convex publish failed:', err)
    throw err
  }
}

export async function appendEventByBindingKey(key: string, subpath: string, payload: unknown): Promise<StoredEvent> {
  if (getBackendMode() === 'local') {
    throw new Error('publish/key is not supported in local backend mode yet')
  }

  const payloadRecord =
    payload && typeof payload === 'object' ? ({ ...(payload as Record<string, unknown>) } as Record<string, unknown>) : {}
  if (typeof payloadRecord.message === 'string' && typeof payloadRecord.content !== 'string') {
    payloadRecord.content = payloadRecord.message
  }

  const client = createConvexClient()
  const convexArgs: Record<string, any> = {
    key,
    subpath,
    time: payloadRecord.time,
    timestamp: payloadRecord.timestamp,
    type: payloadRecord.type,
    status: payloadRecord.status,
    content: payloadRecord.content,
    message: payloadRecord.message,
  }
  Object.keys(convexArgs).forEach((argKey) => convexArgs[argKey] === undefined && delete convexArgs[argKey])

  try {
    const result = await client.mutation(convexApi.events.publishByKey, convexArgs)
    const event = parseConvexStoredEvent(result)
    await sendPushNotificationsForEvent({
      workspace: event.workspace,
      path: event.path,
      status: event.status,
      content: event.content,
    }).catch((pushError) => {
      console.warn('[EventRepository] Push fanout failed for published keyed event', {
        path: event.path,
        error: pushError instanceof Error ? pushError.message : String(pushError),
      })
    })
    return event
  } catch (err) {
    console.error('[EventRepository] Convex publishByKey failed:', err)
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
    status: (filters as any).status,
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

export async function clearAll(): Promise<{ success: boolean; deletedEvents: number; deletedEntities: number }> {
  if (getBackendMode() === 'local') {
    const { appendEvent: _, getDashboardSnapshot: __, getStatusSnapshot: ___, clearAll: localClearAll } = await import('~/lib/server/event-store')
    return localClearAll()
  }

  const client = createConvexClient()
  const result = await client.mutation(convexApi.events.clearAll, {})
  return result as any
}

export async function upsertPushSubscription(input: PushSubscriptionRecord): Promise<UpsertPushSubscriptionResult> {
  if (getBackendMode() === 'local') {
    return {
      ok: true,
      pushConfigured: false,
      missingConfig: ['CONVEX_URL'],
    }
  }

  const client = createConvexClient()
  const args: Record<string, any> = {
    endpoint: input.endpoint,
    expirationTime: input.expirationTime,
    p256dh: input.p256dh,
    auth: input.auth,
    workspace: input.workspace,
    userAgent: input.userAgent,
    clientVapidPublicKey: input.clientVapidPublicKey,
  }
  Object.keys(args).forEach((key) => args[key] === undefined && delete args[key])
  try {
    const result = await client.mutation(convexApi.push.upsertSubscription, args)
    return result as UpsertPushSubscriptionResult
  } catch (error) {
    if (!isUnknownClientVapidFieldError(error)) {
      throw error
    }

    // Backward compatibility: retry against older deployed Convex functions
    // that don't yet accept `clientVapidPublicKey`.
    const fallbackArgs = { ...args }
    delete fallbackArgs.clientVapidPublicKey
    const fallbackResult = await client.mutation(convexApi.push.upsertSubscription, fallbackArgs)
    return fallbackResult as UpsertPushSubscriptionResult
  }
}

function isUnknownClientVapidFieldError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const hasField = message.includes('clientVapidPublicKey')
  const unknownArg =
    message.toLowerCase().includes('extra field') ||
    message.toLowerCase().includes('unknown field') ||
    message.toLowerCase().includes('not allowed')
  return hasField && unknownArg
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean; deleted?: number }> {
  if (getBackendMode() === 'local') {
    return { ok: true, deleted: 0 }
  }

  const client = createConvexClient()
  const result = await client.mutation(convexApi.push.removeSubscription, { endpoint })
  return result as { ok: boolean; deleted?: number }
}

export async function sendPushNotificationsForEvent(input: {
  workspace?: string
  path: string
  status?: string
  content?: string
}) {
  if (getBackendMode() === 'local') {
    return { attempted: 0, delivered: 0, pruned: 0, skipped: true }
  }

  const client = createConvexClient()
  const args: Record<string, unknown> = {
    workspace: input.workspace,
    path: input.path,
    status: input.status,
    content: input.content,
  }
  Object.keys(args).forEach((key) => args[key] === undefined && delete args[key])
  const result = await client.action(convexApi.push_fanout.sendPushNotificationsForEvent, args)
  return result as { attempted: number; delivered: number; pruned: number; skipped: boolean }
}
