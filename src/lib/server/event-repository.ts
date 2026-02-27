import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import { buildPushHTTPRequest } from '@pushforge/builder'
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
const DEFAULT_PUSH_TTL_SECONDS = 60 * 60

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
    return parseConvexStoredEvent(result)
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
    return parseConvexStoredEvent(result)
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

function getServerEnv(name: string): string | undefined {
  const processValue = getProcessEnv(name)
  if (processValue) return processValue
  const importMetaValue = (import.meta as any).env?.[name]
  return typeof importMetaValue === 'string' && importMetaValue.length > 0 ? importMetaValue : undefined
}

function resolvePrivateJWK(privateKey: string, publicKey?: string): JsonWebKey | string {
  const trimmed = privateKey.trim()

  if (trimmed.startsWith('{')) {
    return privateKey
  }

  if (!publicKey) {
    throw new Error('VAPID_PUBLIC_KEY (or VITE_VAPID_PUBLIC_KEY) is required when VAPID_PRIVATE_KEY is not a JWK JSON string')
  }

  const publicBytes = base64UrlToBytes(publicKey)
  const privateBytes = base64UrlToBytes(privateKey)

  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY must be an uncompressed P-256 public key (base64url)')
  }
  if (privateBytes.length !== 32) {
    throw new Error('VAPID_PRIVATE_KEY must be a 32-byte P-256 private key (base64url) when not using JWK')
  }

  return {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(publicBytes.slice(1, 33)),
    y: bytesToBase64Url(publicBytes.slice(33, 65)),
    d: bytesToBase64Url(privateBytes),
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join('')
  const encoded = btoa(binary)
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function listPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  if (getBackendMode() === 'local') return []
  const client = createConvexClient()
  const result = await client.query(convexApi.push.listSubscriptionsForWorkspace, {})
  return Array.isArray(result) ? (result as PushSubscriptionRecord[]) : []
}

function buildPushPayload(path: string, status?: string, content?: string) {
  const summary = content?.trim() ? content.trim() : `New ${status ?? 'status'} event`
  return {
    title: 'Tailwatch',
    body: `${path}: ${summary}`.slice(0, 180),
    url: '/',
    tag: 'tailwatch-event',
  }
}

function isMissingPushFanoutActionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  return (
    (message.includes('push_fanout:sendPushNotificationsForEvent') ||
      message.includes('push:sendPushNotificationsForEvent')) &&
    (normalized.includes('could not find') || normalized.includes('not found'))
  )
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

  try {
    const result = await client.action(convexApi.push_fanout.sendPushNotificationsForEvent, args)
    return result as { attempted: number; delivered: number; pruned: number; skipped: boolean }
  } catch (error) {
    if (!isMissingPushFanoutActionError(error)) {
      throw error
    }

    // Backward compatibility for deployments that haven't shipped the Convex
    // push action yet.
    console.warn('[PushDelivery] Convex fanout action unavailable, using legacy server fanout')
  }

  const privateKey = getServerEnv('VAPID_PRIVATE_KEY')
  const adminContact = getServerEnv('VAPID_SUBJECT')
  const publicKey = getServerEnv('VAPID_PUBLIC_KEY') ?? getServerEnv('VITE_VAPID_PUBLIC_KEY')

  if (!privateKey || !adminContact) {
    console.warn('[PushDelivery] Missing push config', {
      hasPrivateKey: Boolean(privateKey),
      hasSubject: Boolean(adminContact),
    })
    return { attempted: 0, delivered: 0, pruned: 0, skipped: true }
  }

  let privateJWK: JsonWebKey | string
  try {
    privateJWK = resolvePrivateJWK(privateKey, publicKey)
  } catch (error) {
    console.warn('[PushDelivery] Invalid VAPID key configuration', error)
    return { attempted: 0, delivered: 0, pruned: 0, skipped: true }
  }

  const subscriptions = await listPushSubscriptions()
  if (subscriptions.length === 0) {
    return { attempted: 0, delivered: 0, pruned: 0, skipped: false }
  }

  const payload = buildPushPayload(input.path, input.status, input.content)
  let delivered = 0
  let pruned = 0

  await Promise.all(
    subscriptions.map(async (subscription) => {
      if (!subscription.p256dh || !subscription.auth) {
        const result = await removePushSubscription(subscription.endpoint)
        pruned += result.deleted ?? 0
        return
      }

      let request: Awaited<ReturnType<typeof buildPushHTTPRequest>>
      try {
        request = await buildPushHTTPRequest({
          privateJWK,
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          message: {
            payload,
            adminContact,
            options: {
              ttl: DEFAULT_PUSH_TTL_SECONDS,
              urgency: 'high',
              topic: 'tailwatch-event',
            },
          },
        })
      } catch (error) {
        console.warn('[PushDelivery] Failed to build request', {
          endpoint: subscription.endpoint,
          error: error instanceof Error ? error.message : String(error),
        })
        return
      }

      let response: Response
      try {
        response = await fetch(request.endpoint, {
          method: 'POST',
          headers: request.headers,
          body: request.body,
        })
      } catch (error) {
        console.warn('[PushDelivery] Network failure', {
          endpoint: subscription.endpoint,
          error: error instanceof Error ? error.message : String(error),
        })
        return
      }

      if (response.ok) {
        delivered += 1
        return
      }

      if (response.status === 404 || response.status === 410) {
        const result = await removePushSubscription(subscription.endpoint)
        pruned += result.deleted ?? 0
        return
      }

      console.warn('[PushDelivery] Push request failed', {
        endpoint: subscription.endpoint,
        status: response.status,
      })
    }),
  )

  return {
    attempted: subscriptions.length,
    delivered,
    pruned,
    skipped: false,
  }
}
