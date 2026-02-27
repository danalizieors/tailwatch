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

const DEFAULT_WORKSPACE = 'default'
const DEFAULT_INCLUDE_PATHS = ['/']
const convexApi = anyApi as any

const localAliasByPath = new Map<string, string>()
const localPathByAlias = new Map<string, string>()
const localWatcherByWorkspaceAndKey = new Map<string, WatcherRecord>()

export interface PushSubscriptionRecord {
  endpoint: string
  expirationTime?: number
  p256dh?: string
  auth?: string
  workspace?: string
  userAgent?: string
  clientVapidPublicKey?: string
  updatedAt?: string
  watcherKey?: string
  watcherName?: string
  enabled?: boolean
}

export interface UpsertPushSubscriptionResult {
  ok: boolean
  id?: string
  updated?: boolean
  pushConfigured?: boolean
  missingConfig?: string[]
  serverVapidPublicKey?: string
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

function nowIso() {
  return new Date().toISOString()
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeWorkspace(value?: string) {
  const next = value?.trim()
  return next || DEFAULT_WORKSPACE
}

function normalizeWatcherKey(value?: string) {
  const next = value?.trim()
  if (!next) return randomId('watcher')
  return next.slice(0, 128)
}

function normalizePathForAlias(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return '/'
  const normalized = trimmed.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
  return normalized || '/'
}

function localWatcherStoreKey(workspace: string, watcherKey: string) {
  return `${workspace}::${watcherKey}`
}

function createLocalWatcher(workspace: string, watcherKey: string, name?: string, userAgent?: string): WatcherRecord {
  const now = nowIso()
  return {
    id: randomId('watcher'),
    workspace,
    watcherKey,
    name: name?.trim() || `Watcher ${watcherKey.slice(-6)}`,
    enabled: false,
    includePaths: [...DEFAULT_INCLUDE_PATHS],
    ignorePaths: [],
    endpoint: undefined,
    userAgent,
    hasSubscription: false,
    createdAt: now,
    updatedAt: now,
  }
}

function ensureLocalCurrentWatcher(input: { workspace?: string; watcherKey?: string; name?: string; userAgent?: string }) {
  const workspace = normalizeWorkspace(input.workspace)
  const watcherKey = normalizeWatcherKey(input.watcherKey)
  const key = localWatcherStoreKey(workspace, watcherKey)

  const existing = localWatcherByWorkspaceAndKey.get(key)
  if (existing) {
    const next: WatcherRecord = {
      ...existing,
      name: input.name?.trim() ? input.name.trim() : existing.name,
      userAgent: input.userAgent ?? existing.userAgent,
      updatedAt: nowIso(),
    }
    localWatcherByWorkspaceAndKey.set(key, next)
    return next
  }

  const created = createLocalWatcher(workspace, watcherKey, input.name, input.userAgent)
  localWatcherByWorkspaceAndKey.set(key, created)
  return created
}

function ensureLocalPathAlias(workspace: string, path: string) {
  const normalizedPath = normalizePathForAlias(path)
  const mapKey = `${workspace}::${normalizedPath}`

  const existingAlias = localAliasByPath.get(mapKey)
  if (existingAlias) {
    return {
      aliasId: existingAlias,
      path: normalizedPath,
      workspace,
      created: false,
    }
  }

  const aliasId = Math.random().toString(36).slice(2, 10)
  localAliasByPath.set(mapKey, aliasId)
  localPathByAlias.set(`${workspace}::${aliasId}`, normalizedPath)

  return {
    aliasId,
    path: normalizedPath,
    workspace,
    created: true,
  }
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
  Object.keys(convexArgs).forEach((key) => convexArgs[key] === undefined && delete convexArgs[key])

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
  Object.keys(args).forEach((key) => (args[key] === undefined || args[key] === null) && delete args[key])

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
  Object.keys(args).forEach((key) => (args[key] === undefined || args[key] === null) && delete args[key])

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
    const watcher = ensureLocalCurrentWatcher({
      workspace: input.workspace,
      watcherKey: input.watcherKey ?? input.endpoint,
      name: input.watcherName,
      userAgent: input.userAgent,
    })

    const next: WatcherRecord = {
      ...watcher,
      endpoint: input.endpoint,
      hasSubscription: true,
      enabled: input.enabled ?? true,
      updatedAt: nowIso(),
    }
    localWatcherByWorkspaceAndKey.set(localWatcherStoreKey(next.workspace, next.watcherKey), next)

    return {
      ok: true,
      id: next.id,
      updated: true,
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
    watcherKey: input.watcherKey,
    watcherName: input.watcherName,
    enabled: input.enabled,
  }
  Object.keys(args).forEach((key) => args[key] === undefined && delete args[key])
  try {
    const result = await client.mutation(convexApi.push.upsertSubscription, args)
    return result as UpsertPushSubscriptionResult
  } catch (error) {
    if (!isUnknownPushUpsertFieldError(error)) {
      throw error
    }

    // Backward compatibility: retry against older deployed Convex functions
    // that don't yet accept watcher-aware args.
    const fallbackArgs = { ...args }
    delete fallbackArgs.clientVapidPublicKey
    delete fallbackArgs.watcherKey
    delete fallbackArgs.watcherName
    delete fallbackArgs.enabled
    const fallbackResult = await client.mutation(convexApi.push.upsertSubscription, fallbackArgs)
    return fallbackResult as UpsertPushSubscriptionResult
  }
}

function isUnknownPushUpsertFieldError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const hasKnownField =
    message.includes('clientVapidPublicKey') ||
    message.includes('watcherKey') ||
    message.includes('watcherName') ||
    message.includes('enabled')
  const unknownArg =
    message.toLowerCase().includes('extra field') ||
    message.toLowerCase().includes('unknown field') ||
    message.toLowerCase().includes('not allowed')
  return hasKnownField && unknownArg
}

export async function removePushSubscription(
  input:
    | string
    | {
        endpoint?: string
        workspace?: string
        watcherKey?: string
      },
): Promise<{ ok: boolean; deleted?: number }> {
  const request = typeof input === 'string' ? { endpoint: input } : input

  if (getBackendMode() === 'local') {
    const workspace = normalizeWorkspace(request.workspace)
    const watcherKey = request.watcherKey ? normalizeWatcherKey(request.watcherKey) : undefined
    let deleted = 0

    if (watcherKey) {
      const key = localWatcherStoreKey(workspace, watcherKey)
      const existing = localWatcherByWorkspaceAndKey.get(key)
      if (existing) {
        localWatcherByWorkspaceAndKey.set(key, {
          ...existing,
          endpoint: undefined,
          hasSubscription: false,
          enabled: false,
          updatedAt: nowIso(),
        })
        deleted += 1
      }
    }

    if (request.endpoint) {
      for (const [key, watcher] of localWatcherByWorkspaceAndKey.entries()) {
        if (watcher.workspace !== workspace) continue
        if (watcher.endpoint !== request.endpoint) continue
        localWatcherByWorkspaceAndKey.set(key, {
          ...watcher,
          endpoint: undefined,
          hasSubscription: false,
          enabled: false,
          updatedAt: nowIso(),
        })
        deleted += 1
      }
    }

    return { ok: true, deleted }
  }

  const client = createConvexClient()
  const args: Record<string, string> = {}
  if (request.endpoint) args.endpoint = request.endpoint
  if (request.workspace) args.workspace = request.workspace
  if (request.watcherKey) args.watcherKey = request.watcherKey

  const result = await client.mutation(convexApi.push.removeSubscription, args)
  return result as { ok: boolean; deleted?: number }
}

export async function listPushSubscriptions(workspace?: string, watcherKey?: string): Promise<PushSubscriptionRecord[]> {
  if (getBackendMode() === 'local') {
    const normalizedWorkspace = normalizeWorkspace(workspace)
    const scopedWatcherKey = watcherKey ? normalizeWatcherKey(watcherKey) : undefined

    const rows = Array.from(localWatcherByWorkspaceAndKey.values())
      .filter((watcher) => watcher.workspace === normalizedWorkspace)
      .filter((watcher) => (scopedWatcherKey ? watcher.watcherKey === scopedWatcherKey : true))
      .filter((watcher) => Boolean(watcher.endpoint))

    return rows.map((watcher) => ({
      endpoint: watcher.endpoint!,
      workspace: watcher.workspace,
      userAgent: watcher.userAgent,
      updatedAt: watcher.updatedAt,
      watcherKey: watcher.watcherKey,
      watcherName: watcher.name,
      enabled: watcher.enabled,
    }))
  }

  const client = createConvexClient()
  const args: Record<string, string> = {}
  if (workspace && workspace.trim()) {
    args.workspace = workspace.trim()
  }
  if (watcherKey && watcherKey.trim()) {
    args.watcherKey = watcherKey.trim()
  }

  const result = await client.query(convexApi.push.listSubscriptionsForWorkspace, args)
  return Array.isArray(result) ? (result as PushSubscriptionRecord[]) : []
}

export async function ensureDefaultWatcher(input: {
  workspace?: string
  watcherKey?: string
  userAgent?: string
}): Promise<WatcherRecord> {
  if (getBackendMode() === 'local') {
    return ensureLocalCurrentWatcher(input)
  }

  const client = createConvexClient()
  const args: Record<string, string> = {}
  if (input.workspace) args.workspace = input.workspace
  if (input.watcherKey) args.watcherKey = input.watcherKey
  if (input.userAgent) args.userAgent = input.userAgent

  const result = await client.mutation(convexApi.watchers.ensureDefaultWatcher, args)
  return result as WatcherRecord
}

export async function getOrCreateCurrentWatcher(input: {
  workspace?: string
  watcherKey?: string
  name?: string
  userAgent?: string
}): Promise<WatcherRecord> {
  if (getBackendMode() === 'local') {
    const watcher = ensureLocalCurrentWatcher(input)
    return {
      ...watcher,
      isCurrent: true,
    }
  }

  const client = createConvexClient()
  const args: Record<string, string> = {}
  if (input.workspace) args.workspace = input.workspace
  if (input.watcherKey) args.watcherKey = input.watcherKey
  if (input.name) args.name = input.name
  if (input.userAgent) args.userAgent = input.userAgent

  const result = await client.mutation(convexApi.watchers.getOrCreateCurrentWatcher, args)
  return result as WatcherRecord
}

export async function listWatchers(workspace?: string, watcherKey?: string): Promise<WatcherRecord[]> {
  if (getBackendMode() === 'local') {
    const normalizedWorkspace = normalizeWorkspace(workspace)
    const scopedWatcherKey = watcherKey ? normalizeWatcherKey(watcherKey) : undefined

    return Array.from(localWatcherByWorkspaceAndKey.values())
      .filter((watcher) => watcher.workspace === normalizedWorkspace)
      .filter((watcher) => (scopedWatcherKey ? watcher.watcherKey === scopedWatcherKey : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  const client = createConvexClient()
  const args: Record<string, string> = {}
  if (workspace?.trim()) args.workspace = workspace.trim()
  if (watcherKey?.trim()) args.watcherKey = watcherKey.trim()
  const result = await client.query(convexApi.watchers.listWatchers, args)
  return Array.isArray(result) ? (result as WatcherRecord[]) : []
}

export async function createWatcher(input: {
  workspace?: string
  name?: string
  includePaths?: string[]
  ignorePaths?: string[]
  watcherKey?: string
  userAgent?: string
}): Promise<WatcherRecord> {
  if (getBackendMode() === 'local') {
    const workspace = normalizeWorkspace(input.workspace)
    let watcherKey = normalizeWatcherKey(input.watcherKey)
    const existing = localWatcherByWorkspaceAndKey.get(localWatcherStoreKey(workspace, watcherKey))
    if (existing) {
      watcherKey = normalizeWatcherKey()
    }
    const created = createLocalWatcher(workspace, watcherKey, input.name, input.userAgent)
    const next: WatcherRecord = {
      ...created,
      includePaths: input.includePaths?.length ? input.includePaths : [...DEFAULT_INCLUDE_PATHS],
      ignorePaths: input.ignorePaths?.length ? input.ignorePaths : [],
    }
    localWatcherByWorkspaceAndKey.set(localWatcherStoreKey(workspace, watcherKey), next)
    return next
  }

  const client = createConvexClient()
  const args: Record<string, unknown> = {
    workspace: input.workspace,
    name: input.name,
    includePaths: input.includePaths,
    ignorePaths: input.ignorePaths,
    watcherKey: input.watcherKey,
    userAgent: input.userAgent,
  }
  Object.keys(args).forEach((key) => args[key] === undefined && delete args[key])
  const result = await client.mutation(convexApi.watchers.createWatcher, args)
  return result as WatcherRecord
}

export async function updateWatcher(input: {
  watcherId: string
  enabled?: boolean
  name?: string
  includePaths?: string[]
  ignorePaths?: string[]
  watcherKey?: string
}): Promise<WatcherRecord> {
  if (getBackendMode() === 'local') {
    const rows = Array.from(localWatcherByWorkspaceAndKey.entries())
    const entry = rows.find(([, watcher]) => watcher.id === input.watcherId)
    if (!entry) {
      throw new Error('Watcher not found')
    }

    const [storeKey, watcher] = entry
    const next: WatcherRecord = {
      ...watcher,
      enabled: typeof input.enabled === 'boolean' ? input.enabled : watcher.enabled,
      name: typeof input.name === 'string' ? input.name : watcher.name,
      includePaths: Array.isArray(input.includePaths) ? input.includePaths : watcher.includePaths,
      ignorePaths: Array.isArray(input.ignorePaths) ? input.ignorePaths : watcher.ignorePaths,
      updatedAt: nowIso(),
    }

    localWatcherByWorkspaceAndKey.set(storeKey, next)
    return next
  }

  const client = createConvexClient()
  const args: Record<string, unknown> = {
    watcherId: input.watcherId,
    enabled: input.enabled,
    name: input.name,
    includePaths: input.includePaths,
    ignorePaths: input.ignorePaths,
    watcherKey: input.watcherKey,
  }
  Object.keys(args).forEach((key) => args[key] === undefined && delete args[key])
  const result = await client.mutation(convexApi.watchers.updateWatcher, args)
  return result as WatcherRecord
}

export async function ensurePathAlias(workspace: string | undefined, path: string): Promise<PathAliasRecord> {
  const normalizedWorkspace = normalizeWorkspace(workspace)
  if (getBackendMode() === 'local') {
    return ensureLocalPathAlias(normalizedWorkspace, path)
  }

  const client = createConvexClient()
  const result = await client.mutation(convexApi.watchers.ensurePathAlias, {
    workspace: normalizedWorkspace,
    path,
  })
  return result as PathAliasRecord
}

export async function resolvePathAlias(workspace: string | undefined, aliasId: string): Promise<PathAliasRecord | null> {
  const normalizedWorkspace = normalizeWorkspace(workspace)

  if (getBackendMode() === 'local') {
    const path = localPathByAlias.get(`${normalizedWorkspace}::${aliasId}`)
    if (!path) return null
    return {
      aliasId,
      path,
      workspace: normalizedWorkspace,
      created: false,
    }
  }

  const client = createConvexClient()
  const result = (await client.query(convexApi.watchers.resolvePathAlias, {
    workspace: normalizedWorkspace,
    aliasId,
  })) as { found?: boolean; aliasId?: string; path?: string; workspace?: string }

  if (!result?.found || !result.aliasId || !result.path) {
    return null
  }

  return {
    aliasId: result.aliasId,
    path: result.path,
    workspace: result.workspace ?? normalizedWorkspace,
    created: false,
  }
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
