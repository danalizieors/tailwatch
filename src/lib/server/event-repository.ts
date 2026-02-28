import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import { adjectives, nouns } from 'human-id'
import type { DashboardSnapshot, StoredEvent } from '~/lib/types'
import { getProcessEnv } from '~/lib/server/runtime-env'
import {
  appendEvent as appendLocalEvent,
  getDashboardSnapshot as getLocalDashboardSnapshot,
  getStatusSnapshot as getLocalStatusSnapshot,
  type DashboardFilters,
} from '~/lib/server/event-store'

type BackendMode = 'local' | 'convex'

const DEFAULT_VOLUME = 'personal'
const DEFAULT_INCLUDE_PATHS = ['/']
const convexApi = anyApi as any
const KEY_ADJECTIVES = adjectives
const KEY_NOUNS = nouns

const localAliasByPath = new Map<string, string>()
const localPathByAlias = new Map<string, string>()
const localDeviceByVolumeAndKey = new Map<string, DeviceRecord>()
const localVolumeById = new Map<string, { id: string; name: string; key: string; keyEnabled: boolean }>()

export interface PushSubscriptionRecord {
  endpoint: string
  expirationTime?: number
  p256dh?: string
  auth?: string
  userAgent?: string
  clientVapidPublicKey?: string
  updatedAt?: string
  deviceKey?: string
  deviceName?: string
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

function nowIso() {
  return new Date().toISOString()
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeVolume(value?: string) {
  const next = value?.trim()
  return next || DEFAULT_VOLUME
}

function normalizeDeviceKey(value?: string) {
  const next = value?.trim()
  if (!next) return randomId('device')
  return next.slice(0, 128)
}

function normalizePathForAlias(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return '/'
  const normalized = trimmed.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
  return normalized || '/'
}

function normalizeVolumeName(value: string) {
  const next = value.trim()
  if (!next) throw new Error('Volume name is required')
  if (next.length > 120) throw new Error('Volume name must be 120 characters or fewer')
  if (next.includes('/')) throw new Error('Volume name cannot contain "/"')
  return next
}

function pickRandomItem(values: readonly string[]) {
  const index = Math.floor(Math.random() * values.length)
  return values[index] ?? values[0] ?? 'steady'
}

function singularizeNoun(value: string) {
  const word = value.toLowerCase()
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.endsWith('ches') || word.endsWith('shes') || word.endsWith('xes') || word.endsWith('zes') || word.endsWith('ses')) {
    return word.slice(0, -2)
  }
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

function createHumanReadableVolumeKey() {
  const adjective = pickRandomItem(KEY_ADJECTIVES)
  const noun = singularizeNoun(pickRandomItem(KEY_NOUNS))
  const number = 10 + Math.floor(Math.random() * 90)
  return `${adjective}-${noun}-${number}`
}

function createUniqueLocalVolumeKey() {
  const used = new Set(Array.from(localVolumeById.values()).map((row) => row.key))
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const candidate = createHumanReadableVolumeKey()
    if (!used.has(candidate)) {
      return candidate
    }
  }
  throw new Error('Failed to generate a unique key')
}

function ensureLocalPersonalVolume() {
  const existing = Array.from(localVolumeById.values()).find((row) => row.name === DEFAULT_VOLUME)
  if (existing) return existing

  const created = {
    id: randomId('volume'),
    name: DEFAULT_VOLUME,
    key: createUniqueLocalVolumeKey(),
    keyEnabled: true,
  }
  localVolumeById.set(created.id, created)
  return created
}

function localDeviceStoreKey(volume: string, deviceKey: string) {
  return `${volume}::${deviceKey}`
}

function createLocalDevice(volume: string, deviceKey: string, name?: string, userAgent?: string): DeviceRecord {
  const now = nowIso()
  return {
    id: randomId('device'),
    volume,
    deviceKey,
    name: name?.trim() || `Device ${deviceKey.slice(-6)}`,
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

function ensureLocalCurrentDevice(input: { volume?: string; deviceKey?: string; name?: string; userAgent?: string }) {
  const volume = normalizeVolume(input.volume)
  const deviceKey = normalizeDeviceKey(input.deviceKey)
  const key = localDeviceStoreKey(volume, deviceKey)

  const existing = localDeviceByVolumeAndKey.get(key)
  if (existing) {
    const next: DeviceRecord = {
      ...existing,
      name: input.name?.trim() ? input.name.trim() : existing.name,
      userAgent: input.userAgent ?? existing.userAgent,
      updatedAt: nowIso(),
    }
    localDeviceByVolumeAndKey.set(key, next)
    return next
  }

  const created = createLocalDevice(volume, deviceKey, input.name, input.userAgent)
  localDeviceByVolumeAndKey.set(key, created)
  return created
}

function ensureLocalPathAlias(volume: string, path: string) {
  const normalizedPath = normalizePathForAlias(path)
  const mapKey = `${volume}::${normalizedPath}`

  const existingAlias = localAliasByPath.get(mapKey)
  if (existingAlias) {
    return {
      aliasId: existingAlias,
      path: normalizedPath,
      volume,
      created: false,
    }
  }

  const aliasId = Math.random().toString(36).slice(2, 10)
  localAliasByPath.set(mapKey, aliasId)
  localPathByAlias.set(`${volume}::${aliasId}`, normalizedPath)

  return {
    aliasId,
    path: normalizedPath,
    volume,
    created: true,
  }
}

function mapDeviceRecord(value: any): DeviceRecord {
  const deviceKey =
    typeof value?.deviceKey === 'string' && value.deviceKey.trim()
      ? value.deviceKey
      : normalizeDeviceKey(typeof value?.userId === 'string' ? value.userId : undefined)

  const createdAt =
    typeof value?.createdAt === 'string'
      ? value.createdAt
      : new Date(Number(value?._creationTime ?? Date.now())).toISOString()
  const updatedAt =
    typeof value?.updatedAt === 'string'
      ? value.updatedAt
      : new Date(Number(value?._creationTime ?? Date.now())).toISOString()

  return {
    id: String(value?.id ?? value?._id ?? randomId('device')),
    volume: String(value?.volume ?? DEFAULT_VOLUME),
    deviceKey,
    name: typeof value?.name === 'string' && value.name.trim() ? value.name : `Device ${deviceKey.slice(-6)}`,
    enabled: Boolean(typeof value?.enabled === 'boolean' ? value.enabled : value?.notifications),
    includePaths:
      Array.isArray(value?.includePaths) && value.includePaths.every((entry: unknown) => typeof entry === 'string')
        ? [...value.includePaths]
        : [...DEFAULT_INCLUDE_PATHS],
    ignorePaths:
      Array.isArray(value?.ignorePaths) && value.ignorePaths.every((entry: unknown) => typeof entry === 'string')
        ? [...value.ignorePaths]
        : [],
    endpoint: typeof value?.endpoint === 'string' ? value.endpoint : undefined,
    userAgent: typeof value?.userAgent === 'string' ? value.userAgent : undefined,
    hasSubscription:
      typeof value?.hasSubscription === 'boolean'
        ? value.hasSubscription
        : Boolean(value?.endpoint && value?.p256dh && value?.auth),
    createdAt,
    updatedAt,
    isCurrent: typeof value?.isCurrent === 'boolean' ? value.isCurrent : undefined,
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

async function ensurePersonalVolumeIfNeeded(client?: ConvexHttpClient) {
  if (getBackendMode() === 'local') {
    ensureLocalPersonalVolume()
    return
  }

  const convexClient = client ?? createConvexClient()
  await convexClient.mutation(convexApi.volumes.ensurePersonalVolume, {})
}

function parseConvexStoredEvent(value: any): StoredEvent {
  if (!value || typeof value !== 'object') {
    throw new Error('Convex publish returned an invalid event payload')
  }

  const time = String(value.time ?? new Date().toISOString())
  const volume = String(value.volume ?? DEFAULT_VOLUME)
  return {
    id: String(value.id ?? value._id ?? ''),
    volume,
    path: String(value.path ?? ''),
    segments: Array.isArray(value.segments) ? value.segments.map((segment: unknown) => String(segment)) : [],
    time,
    ingestedAt: String(value.ingestedAt ?? new Date().toISOString()),
    status: value.status === 'busy' ? 'busy' : 'idle',
    content: typeof value.content === 'string' ? value.content : undefined,
    pathId: value.pathId ? String(value.pathId) : undefined,
    submittedPath: value.submittedPath ? String(value.submittedPath) : undefined,
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

  const events = value.events.map((event: any) => ({
    ...event,
    volume: event.volume ?? DEFAULT_VOLUME,
  }))
  const paths = value.paths.map((row: any) => ({
    ...row,
    volume: row.volume ?? DEFAULT_VOLUME,
  }))
  const entities = value.entities.map((row: any) => ({
    ...row,
    volume: row.volume ?? DEFAULT_VOLUME,
  }))

  return {
    ...value,
    events,
    paths,
    entities,
  } as DashboardSnapshot
}

export async function appendEvent(topicPath: string, payload: unknown): Promise<StoredEvent> {
  if (getBackendMode() === 'local') {
    return appendLocalEvent(topicPath, payload)
  }

  const payloadRecord =
    payload && typeof payload === 'object' ? ({ ...(payload as Record<string, unknown>) } as Record<string, unknown>) : {}

  const client = createConvexClient()
  const volume = payloadRecord.volume as string | undefined

  // Sanitize for Convex publish mutation args
  const convexArgs: Record<string, any> = {
    path: topicPath,
    volume,
    time: payloadRecord.time,
    status: payloadRecord.status,
    content: payloadRecord.content,
  }

  // Remove undefined to avoid sending them as nulls/undefineds if mutation args don't like it
  Object.keys(convexArgs).forEach((key) => convexArgs[key] === undefined && delete convexArgs[key])

  try {
    const result = await client.mutation(convexApi.events.publish, convexArgs)
    const event = parseConvexStoredEvent(result)
    await sendPushNotificationsForEvent({
      volume: event.volume,
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

  const client = createConvexClient()
  const convexArgs: Record<string, any> = {
    key,
    subpath,
    time: payloadRecord.time,
    status: payloadRecord.status,
    content: payloadRecord.content,
  }
  Object.keys(convexArgs).forEach((argKey) => convexArgs[argKey] === undefined && delete convexArgs[argKey])

  try {
    const result = await client.mutation(convexApi.events.publishByKey, convexArgs)
    const event = parseConvexStoredEvent(result)
    await sendPushNotificationsForEvent({
      volume: event.volume,
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
    ensureLocalPersonalVolume()
    return getLocalDashboardSnapshot(filters)
  }

  const client = createConvexClient()
  await ensurePersonalVolumeIfNeeded(client)
  const args: Record<string, any> = {
    volume: typeof filters.volume === 'string' ? filters.volume : undefined,
    topicPrefix: filters.topicPrefix,
    status: filters.status,
    q: filters.q,
    limit: filters.limit,
  }
  Object.keys(args).forEach((key) => (args[key] === undefined || args[key] === null) && delete args[key])

  const result = await client.query(convexApi.events.dashboardSnapshot, args)
  return parseConvexDashboardSnapshot(result)
}

export async function getStatusSnapshot(topicPrefix?: string, volume?: string): Promise<DashboardSnapshot> {
  if (getBackendMode() === 'local') {
    ensureLocalPersonalVolume()
    return getLocalStatusSnapshot(topicPrefix, volume)
  }

  const client = createConvexClient()
  await ensurePersonalVolumeIfNeeded(client)
  const args: Record<string, any> = {
    volume: typeof volume === 'string' ? volume : undefined,
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
    const device = ensureLocalCurrentDevice({
      deviceKey: input.deviceKey ?? input.endpoint,
      name: input.deviceName,
      userAgent: input.userAgent,
    })

    const next: DeviceRecord = {
      ...device,
      endpoint: input.endpoint,
      hasSubscription: true,
      enabled: input.enabled ?? true,
      updatedAt: nowIso(),
    }
    localDeviceByVolumeAndKey.set(localDeviceStoreKey(next.volume, next.deviceKey), next)

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
    userAgent: input.userAgent,
    clientVapidPublicKey: input.clientVapidPublicKey,
    deviceKey: input.deviceKey,
    deviceName: input.deviceName,
    enabled: input.enabled,
  }
  Object.keys(args).forEach((key) => args[key] === undefined && delete args[key])
  const result = await client.mutation(convexApi.push.upsertSubscription, args)
  return result as UpsertPushSubscriptionResult
}

export async function removePushSubscription(
  input:
    | string
    | {
        endpoint?: string
        deviceKey?: string
      },
): Promise<{ ok: boolean; deleted?: number }> {
  const request = typeof input === 'string' ? { endpoint: input } : input

  if (getBackendMode() === 'local') {
    const deviceKey = request.deviceKey ? normalizeDeviceKey(request.deviceKey) : undefined
    let deleted = 0

    if (deviceKey) {
      for (const [key, device] of localDeviceByVolumeAndKey.entries()) {
        if (device.deviceKey !== deviceKey) continue
        localDeviceByVolumeAndKey.set(key, {
          ...device,
          endpoint: undefined,
          hasSubscription: false,
          enabled: false,
          updatedAt: nowIso(),
        })
        deleted += 1
      }
    }

    if (request.endpoint) {
      for (const [key, device] of localDeviceByVolumeAndKey.entries()) {
        if (device.endpoint !== request.endpoint) continue
        localDeviceByVolumeAndKey.set(key, {
          ...device,
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
  if (request.deviceKey) args.deviceKey = request.deviceKey

  const result = await client.mutation(convexApi.push.removeSubscription, args)
  return result as { ok: boolean; deleted?: number }
}

export async function ensureDefaultDevice(input: {
  deviceKey?: string
  userAgent?: string
}): Promise<DeviceRecord> {
  if (getBackendMode() === 'local') {
    return ensureLocalCurrentDevice(input)
  }

  const client = createConvexClient()
  const args: Record<string, string> = {}
  if (input.deviceKey) args.deviceKey = input.deviceKey
  if (input.userAgent) args.userAgent = input.userAgent

  const result = await client.mutation(convexApi.devices.ensureDefaultDevice, args)
  return mapDeviceRecord(result)
}

export async function getOrCreateCurrentDevice(input: {
  deviceKey?: string
  name?: string
  userAgent?: string
}): Promise<DeviceRecord> {
  if (getBackendMode() === 'local') {
    const device = ensureLocalCurrentDevice(input)
    return {
      ...device,
      isCurrent: true,
    }
  }

  const client = createConvexClient()
  const args: Record<string, string> = {}
  if (input.deviceKey) args.deviceKey = input.deviceKey
  if (input.name) args.name = input.name
  if (input.userAgent) args.userAgent = input.userAgent

  const result = await client.mutation(convexApi.devices.getOrCreateCurrentDevice, args)
  return mapDeviceRecord(result)
}

export async function listDevices(deviceKey?: string): Promise<DeviceRecord[]> {
  if (getBackendMode() === 'local') {
    const scopedDeviceKey = deviceKey ? normalizeDeviceKey(deviceKey) : undefined

    return Array.from(localDeviceByVolumeAndKey.values())
      .filter((device) => (scopedDeviceKey ? device.deviceKey === scopedDeviceKey : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  const client = createConvexClient()
  const args: Record<string, string> = {}
  if (deviceKey?.trim()) args.deviceKey = deviceKey.trim()
  const result = await client.query(convexApi.devices.listDevices, args)
  return Array.isArray(result) ? result.map(mapDeviceRecord) : []
}

export async function createDevice(input: {
  name?: string
  includePaths?: string[]
  ignorePaths?: string[]
  deviceKey?: string
  userAgent?: string
}): Promise<DeviceRecord> {
  if (getBackendMode() === 'local') {
    const volume = DEFAULT_VOLUME
    let deviceKey = normalizeDeviceKey(input.deviceKey)
    const existing = localDeviceByVolumeAndKey.get(localDeviceStoreKey(volume, deviceKey))
    if (existing) {
      deviceKey = normalizeDeviceKey()
    }
    const created = createLocalDevice(volume, deviceKey, input.name, input.userAgent)
    const next: DeviceRecord = {
      ...created,
      includePaths: input.includePaths?.length ? input.includePaths : [...DEFAULT_INCLUDE_PATHS],
      ignorePaths: input.ignorePaths?.length ? input.ignorePaths : [],
    }
    localDeviceByVolumeAndKey.set(localDeviceStoreKey(volume, deviceKey), next)
    return next
  }

  const client = createConvexClient()
  const args: Record<string, unknown> = {
    name: input.name,
    includePaths: input.includePaths,
    ignorePaths: input.ignorePaths,
    deviceKey: input.deviceKey,
    userAgent: input.userAgent,
  }
  Object.keys(args).forEach((key) => args[key] === undefined && delete args[key])
  const result = await client.mutation(convexApi.devices.createDevice, args)
  return mapDeviceRecord(result)
}

export async function updateDevice(input: {
  deviceId: string
  enabled?: boolean
  name?: string
  includePaths?: string[]
  ignorePaths?: string[]
  deviceKey?: string
}): Promise<DeviceRecord> {
  if (getBackendMode() === 'local') {
    const rows = Array.from(localDeviceByVolumeAndKey.entries())
    const entry = rows.find(([, device]) => device.id === input.deviceId)
    if (!entry) {
      throw new Error('Device not found')
    }

    const [storeKey, device] = entry
    const next: DeviceRecord = {
      ...device,
      enabled: typeof input.enabled === 'boolean' ? input.enabled : device.enabled,
      name: typeof input.name === 'string' ? input.name : device.name,
      includePaths: Array.isArray(input.includePaths) ? input.includePaths : device.includePaths,
      ignorePaths: Array.isArray(input.ignorePaths) ? input.ignorePaths : device.ignorePaths,
      updatedAt: nowIso(),
    }

    localDeviceByVolumeAndKey.set(storeKey, next)
    return next
  }

  const client = createConvexClient()
  const args: Record<string, unknown> = {
    deviceId: input.deviceId,
    enabled: input.enabled,
    name: input.name,
    includePaths: input.includePaths,
    ignorePaths: input.ignorePaths,
    deviceKey: input.deviceKey,
  }
  Object.keys(args).forEach((key) => args[key] === undefined && delete args[key])
  const result = await client.mutation(convexApi.devices.updateDevice, args)
  return mapDeviceRecord(result)
}

export async function ensurePathAlias(volume: string | undefined, path: string): Promise<PathAliasRecord> {
  const normalizedVolume = normalizeVolume(volume)
  if (getBackendMode() === 'local') {
    return ensureLocalPathAlias(normalizedVolume, path)
  }

  const client = createConvexClient()
  const result = await client.mutation(convexApi.devices.ensurePathAlias, {
    volume: normalizedVolume,
    path,
  })
  return result as PathAliasRecord
}

export async function resolvePathAlias(volume: string | undefined, aliasId: string): Promise<PathAliasRecord | null> {
  const normalizedVolume = normalizeVolume(volume)

  if (getBackendMode() === 'local') {
    const path = localPathByAlias.get(`${normalizedVolume}::${aliasId}`)
    if (!path) return null
    return {
      aliasId,
      path,
      volume: normalizedVolume,
      created: false,
    }
  }

  const client = createConvexClient()
  const result = (await client.query(convexApi.devices.resolvePathAlias, {
    volume: normalizedVolume,
    aliasId,
  })) as { found?: boolean; aliasId?: string; path?: string; volume?: string }

  if (!result?.found || !result.aliasId || !result.path) {
    return null
  }

  return {
    aliasId: result.aliasId,
    path: result.path,
    volume: result.volume ?? normalizedVolume,
    created: false,
  }
}

function listLocalManagedVolumes() {
  ensureLocalPersonalVolume()

  return Array.from(localVolumeById.values())
    .map((volume): ManagedVolumeRecord => ({
      id: volume.id,
      name: volume.name,
      isDefault: volume.name === DEFAULT_VOLUME,
      key: {
        id: volume.id,
        volumeId: volume.id,
        value: volume.key,
        enabled: volume.keyEnabled,
      },
    }))
    .sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      return a.name.localeCompare(b.name)
    })
}

export async function listManagedVolumes(): Promise<ManagedVolumeRecord[]> {
  if (getBackendMode() === 'local') {
    return listLocalManagedVolumes()
  }

  const client = createConvexClient()
  await ensurePersonalVolumeIfNeeded(client)
  const result = await client.query(convexApi.volumes.listManagedVolumes, {})
  return Array.isArray(result) ? (result as ManagedVolumeRecord[]) : []
}

export async function createManagedVolume(name: string): Promise<ManagedVolumeRecord> {
  if (getBackendMode() === 'local') {
    ensureLocalPersonalVolume()
    const normalized = normalizeVolumeName(name)
    const duplicate = Array.from(localVolumeById.values()).find((row) => row.name === normalized)
    if (duplicate) throw new Error('Volume name already exists')

    const created = {
      id: randomId('volume'),
      name: normalized,
      key: createUniqueLocalVolumeKey(),
      keyEnabled: true,
    }
    localVolumeById.set(created.id, created)
    return {
      id: created.id,
      name: created.name,
      isDefault: false,
      key: {
        id: created.id,
        volumeId: created.id,
        value: created.key,
        enabled: created.keyEnabled,
      },
    }
  }

  const client = createConvexClient()
  const result = await client.mutation(convexApi.volumes.createVolume, { name })
  return result as ManagedVolumeRecord
}

export async function renameManagedVolume(input: { volumeId: string; name: string }): Promise<ManagedVolumeRecord> {
  if (getBackendMode() === 'local') {
    ensureLocalPersonalVolume()
    const normalized = normalizeVolumeName(input.name)
    const volume = localVolumeById.get(input.volumeId)
    if (!volume) throw new Error('Volume not found')
    if (volume.name === DEFAULT_VOLUME && normalized !== DEFAULT_VOLUME) {
      throw new Error('The personal volume cannot be renamed')
    }
    const duplicate = Array.from(localVolumeById.values()).find((row) => row.id !== volume.id && row.name === normalized)
    if (duplicate) throw new Error('Volume name already exists')

    volume.name = normalized
    localVolumeById.set(volume.id, volume)

    return {
      id: volume.id,
      name: volume.name,
      isDefault: volume.name === DEFAULT_VOLUME,
      key: {
        id: volume.id,
        volumeId: volume.id,
        value: volume.key,
        enabled: volume.keyEnabled,
      },
    }
  }

  const client = createConvexClient()
  const result = await client.mutation(convexApi.volumes.renameVolume, {
    volumeId: input.volumeId,
    name: input.name,
  })
  return result as ManagedVolumeRecord
}

export async function updateManagedVolumeKey(input: {
  volumeId: string
  enabled?: boolean
}): Promise<VolumeKeyRecord> {
  if (getBackendMode() === 'local') {
    ensureLocalPersonalVolume()
    const volume = localVolumeById.get(input.volumeId)
    if (!volume) throw new Error('Volume not found')

    volume.keyEnabled = typeof input.enabled === 'boolean' ? input.enabled : volume.keyEnabled
    localVolumeById.set(volume.id, volume)

    return {
      id: volume.id,
      volumeId: volume.id,
      value: volume.key,
      enabled: volume.keyEnabled,
    }
  }

  const client = createConvexClient()
  const args: Record<string, unknown> = {
    volumeId: input.volumeId,
    enabled: input.enabled,
  }
  Object.keys(args).forEach((key) => args[key] === undefined && delete args[key])
  const result = await client.mutation(convexApi.volumes.updateVolumeKey, args)
  return result as VolumeKeyRecord
}

export async function rotateManagedVolumeKey(volumeId: string): Promise<VolumeKeyRecord> {
  if (getBackendMode() === 'local') {
    ensureLocalPersonalVolume()
    const volume = localVolumeById.get(volumeId)
    if (!volume) throw new Error('Volume not found')

    volume.key = createUniqueLocalVolumeKey()
    volume.keyEnabled = true
    localVolumeById.set(volume.id, volume)

    return {
      id: volume.id,
      volumeId: volume.id,
      value: volume.key,
      enabled: volume.keyEnabled,
    }
  }

  const client = createConvexClient()
  const result = await client.mutation(convexApi.volumes.rotateVolumeKey, { volumeId })
  return result as VolumeKeyRecord
}

export async function sendPushNotificationsForEvent(input: {
  volume?: string
  path: string
  status?: string
  content?: string
}) {
  if (getBackendMode() === 'local') {
    return { attempted: 0, delivered: 0, pruned: 0, skipped: true }
  }

  const client = createConvexClient()
  const args: Record<string, unknown> = {
    volume: input.volume,
    path: input.path,
    status: input.status,
    content: input.content,
  }
  Object.keys(args).forEach((key) => args[key] === undefined && delete args[key])
  const result = await client.action(convexApi.push_fanout.sendPushNotificationsForEvent, args)
  return result as { attempted: number; delivered: number; pruned: number; skipped: boolean }
}
