import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type {
  BindingRecord,
  DashboardSnapshot,
  EntitySnapshot,
  EventStatus,
  PathSnapshot,
  PublishEventPayload,
  StoredEvent,
  TopicNode,
  VolumeRecord,
} from '~/lib/types'

const STORE_DIR = path.join(process.cwd(), 'data')
const STORE_FILE = path.join(STORE_DIR, 'events.json')
const MAX_STORED_EVENTS = 5_000
const DEFAULT_VOLUME = 'personal'

const publishSchema = z
  .object({
    time: z.string().datetime().optional(),
    status: z.string().min(1).max(100).optional(),
    content: z.string().max(10_000).optional(),
    volume: z.string().min(1).max(200).optional(),
  })
  .strip()

const v2FileSchema = z.object({
  version: z.literal(2),
  volumes: z.array(z.unknown()).optional(),
  bindings: z.array(z.unknown()).optional(),
  paths: z.array(z.unknown()).optional(),
  events: z.array(z.unknown()),
})

type StoreFile = {
  version: 2
  volumes: VolumeRecord[]
  bindings: BindingRecord[]
  paths: PathSnapshot[]
  events: StoredEvent[]
}

export interface DashboardFilters {
  volume?: string
  topicPrefix?: string
  status?: string
  q?: string
  limit?: number
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

function normalizeTopicPath(value: string) {
  return value.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function splitTopicPath(topicPath: string) {
  const clean = normalizeTopicPath(topicPath)
  const segments = clean ? clean.split('/').filter(Boolean) : []
  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      throw new Error('Invalid path segment')
    }
  }
  return segments
}

function pathMatchesPrefix(pathValue: string, topicPrefix?: string) {
  if (!topicPrefix) return true
  const prefix = normalizeTopicPath(topicPrefix)
  if (!prefix) return true
  return pathValue === prefix || pathValue.startsWith(`${prefix}/`)
}

function normalizeEventStatus(input?: string): EventStatus {
  const normalized = input?.trim().toLowerCase()
  if (normalized === 'busy') return 'busy'
  return 'idle'
}

function normalizeContent(value: Record<string, unknown>) {
  if (typeof value.content === 'string') return value.content
  return undefined
}

function normalizeStoredEvent(raw: unknown): StoredEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>

  const rawPath = typeof value.path === 'string' ? value.path : ''
  if (!rawPath) return null

  let segments: string[]
  let canonicalPath: string
  try {
    canonicalPath = normalizeTopicPath(rawPath)
    if (!canonicalPath) return null
    segments = Array.isArray(value.segments) && value.segments.every((segment) => typeof segment === 'string')
      ? (value.segments as string[])
      : splitTopicPath(canonicalPath)
  } catch {
    return null
  }

  const time =
    typeof value.time === 'string' && value.time
      ? value.time
      : nowIso()
  const ingestedAt = typeof value.ingestedAt === 'string' && value.ingestedAt ? value.ingestedAt : time
  const status = normalizeEventStatus(typeof value.status === 'string' ? value.status : undefined)
  const content = normalizeContent(value)
  const volume = normalizeVolume(typeof value.volume === 'string' ? value.volume : undefined)

  return {
    id: typeof value.id === 'string' ? value.id : randomId('evt'),
    volume,
    path: canonicalPath,
    segments,
    time,
    ingestedAt,
    status,
    content,
    pathId: typeof value.pathId === 'string' ? value.pathId : undefined,
    submittedPath: typeof value.submittedPath === 'string' ? value.submittedPath : undefined,
    entityId: segments[segments.length - 1] || canonicalPath,
    entityType: 'path',
  }
}

function normalizeVolumeRecord(raw: unknown): VolumeRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const slug = normalizeVolume(typeof value.slug === 'string' ? value.slug : typeof value.id === 'string' ? value.id : undefined)
  const now = nowIso()
  return {
    id: typeof value.id === 'string' ? value.id : slug,
    slug,
    name: typeof value.name === 'string' && value.name.trim() ? value.name : slug,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
  }
}

function normalizeBinding(raw: unknown): BindingRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const volume = normalizeVolume(typeof value.volume === 'string' ? value.volume : undefined)
  const route = typeof value.route === 'string' ? normalizeTopicPath(value.route) : ''
  const targetPath = typeof value.targetPath === 'string' ? normalizeTopicPath(value.targetPath) : ''
  if (!route || !targetPath) return null
  const now = nowIso()
  return {
    id: typeof value.id === 'string' ? value.id : randomId('bnd'),
    volume,
    route,
    targetPath,
    keyHash: typeof value.keyHash === 'string' ? value.keyHash : '',
    enabled: value.enabled !== false,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
  }
}

function upsertPathSnapshot(paths: PathSnapshot[], event: StoredEvent) {
  const key = `${event.volume}::${event.path}`
  const existingIndex = paths.findIndex((row) => row.key === key)
  const next: PathSnapshot = {
    key,
    volume: event.volume,
    path: event.path,
    segments: event.segments,
    status: event.status,
    lastTime: event.time,
    lastIngestedAt: event.ingestedAt,
    lastContent: event.content,
  }

  if (existingIndex === -1) {
    paths.push(next)
    return
  }

  // Path state is explicitly "last ingested event wins".
  paths[existingIndex] = {
    ...paths[existingIndex],
    ...next,
  }
}

function rebuildPathsFromEvents(events: StoredEvent[]) {
  const paths: PathSnapshot[] = []
  const sorted = [...events].sort((a, b) => a.ingestedAt.localeCompare(b.ingestedAt) || a.id.localeCompare(b.id))
  for (const event of sorted) {
    upsertPathSnapshot(paths, event)
  }
  return paths
}

function ensureDefaultVolume(volumes: VolumeRecord[], volumeName = DEFAULT_VOLUME) {
  const normalized = normalizeVolume(volumeName)
  const existing = volumes.find((row) => row.slug === normalized || row.id === normalized)
  if (existing) return existing
  const now = nowIso()
  const next: VolumeRecord = {
    id: normalized,
    slug: normalized,
    name: normalized,
    createdAt: now,
    updatedAt: now,
  }
  volumes.push(next)
  return next
}

async function ensureStoreFile() {
  await mkdir(STORE_DIR, { recursive: true })
  try {
    const raw = await readFile(STORE_FILE, 'utf8')
    const parsedJson = JSON.parse(raw)

    const parsedV2 = v2FileSchema.safeParse(parsedJson)
    if (parsedV2.success) {
      const events = parsedV2.data.events.map(normalizeStoredEvent).filter((event): event is StoredEvent => event !== null)
      const volumes = (parsedV2.data.volumes ?? []).map(normalizeVolumeRecord).filter((row): row is VolumeRecord => row !== null)
      const bindings = (parsedV2.data.bindings ?? []).map(normalizeBinding).filter((row): row is BindingRecord => row !== null)
      const rebuiltPaths = rebuildPathsFromEvents(events)

      const normalized: StoreFile = {
        version: 2,
        volumes: volumes.length > 0 ? volumes : [ensureDefaultVolume([])],
        bindings,
        paths: rebuiltPaths,
        events,
      }
      ensureDefaultVolume(normalized.volumes)

      if (JSON.stringify(parsedJson) !== JSON.stringify(normalized)) {
        await saveStoreFile(normalized)
      }
      return normalized
    }

    console.error('[EventStore] Validation failed for events.json')
  } catch (err) {
    if ((err as any).code !== 'ENOENT') {
      console.error('[EventStore] Error reading events.json:', err)
    }
  }

  const seedEvents = createSeedEvents()
  const seed: StoreFile = {
    version: 2,
    volumes: [ensureDefaultVolume([])],
    bindings: [],
    paths: rebuildPathsFromEvents(seedEvents),
    events: seedEvents,
  }
  await saveStoreFile(seed)
  return seed
}

async function saveStoreFile(data: StoreFile) {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(STORE_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function createSeedEvents(): StoredEvent[] {
  const now = Date.now()
  const rows: Array<{ offsetMs: number; path: string; payload: PublishEventPayload }> = [
    {
      offsetMs: 8 * 60_000,
      path: 'agents/claude/planner',
      payload: {
        status: 'idle',
        content: 'Planner initialized. No intervention required.',
      },
    },
    {
      offsetMs: 7 * 60_000,
      path: 'agents/claude/planner',
      payload: {
        status: 'busy',
        content: 'Blocked on deployment approval. **Needs intervention**.',
      },
    },
    {
      offsetMs: 6 * 60_000,
      path: 'agents/claude/planner',
      payload: {
        status: 'idle',
        content: 'Approval received. Continuing normally.',
      },
    },
    {
      offsetMs: 5 * 60_000,
      path: 'agents/gpt/reconciler',
      payload: {
        status: 'idle',
        content: 'Reconciling batch 2026-02-26.',
      },
    },
    {
      offsetMs: 4 * 60_000,
      path: 'agents/gpt/reconciler',
      payload: {
        status: 'busy',
        content: 'Duplicate transaction detected. Please review item `tx_1042`.',
      },
    },
    {
      offsetMs: 3 * 60_000,
      path: 'ops/backups/nightly',
      payload: {
        status: 'idle',
        content: 'Nightly backup completed successfully.',
      },
    },
    {
      offsetMs: 90_000,
      path: 'support/slack-sync',
      payload: {
        status: 'busy',
        content: 'Slack token expired. Re-authentication required.',
      },
    },
    {
      offsetMs: 30_000,
      path: 'support/slack-sync',
      payload: {
        status: 'idle',
        content: 'Slack token refreshed and sync resumed.',
      },
    },
  ]

  return rows.map((row, index) => {
    const time = new Date(now - row.offsetMs).toISOString()
    const ingestedAt = time
    const normalizedPath = normalizeTopicPath(row.path)
    const segments = splitTopicPath(normalizedPath)
    return {
      id: `seed_${index + 1}`,
      volume: DEFAULT_VOLUME,
      path: normalizedPath,
      segments,
      time,
      ingestedAt,
      status: (row.payload.status ?? 'idle') as EventStatus,
      content: row.payload.content,
      entityId: segments[segments.length - 1] || normalizedPath,
      entityType: 'path',
    }
  })
}

function eventMatchesFilters(event: StoredEvent, filters: DashboardFilters) {
  if (filters.volume) {
    if (event.volume !== filters.volume) return false
  } else if (event.volume !== DEFAULT_VOLUME) {
    return false
  }

  if (!pathMatchesPrefix(event.path, filters.topicPrefix)) return false

  if (filters.status && filters.status !== 'all') {
    if (event.status !== filters.status) return false
  }

  if (filters.q) {
    const q = filters.q.toLowerCase()
    const haystack = `${event.path} ${event.content ?? ''}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }

  return true
}

function pathMatchesFilters(row: PathSnapshot, filters: DashboardFilters) {
  if (filters.volume) {
    if (row.volume !== filters.volume) return false
  } else if (row.volume !== DEFAULT_VOLUME) {
    return false
  }

  if (!pathMatchesPrefix(row.path, filters.topicPrefix)) return false

  if (filters.status && filters.status !== 'all') {
    if (row.status !== filters.status) return false
  }

  if (filters.q) {
    const q = filters.q.toLowerCase()
    const haystack = `${row.path} ${row.lastContent ?? ''}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }

  return true
}

function pathStatusRank(status: EventStatus) {
  switch (status) {
    case 'busy':
      return 0
    case 'idle':
      return 1
    default:
      return 2
  }
}

function toEntityCompat(row: PathSnapshot): EntitySnapshot {
  const segments = row.segments.length > 0 ? row.segments : row.path.split('/').filter(Boolean)
  const entityId = segments[segments.length - 1] || row.path || 'path'
  return {
    key: row.key,
    volume: row.volume,
    path: row.path,
    entityId,
    entityType: 'path',
    currentStatus: row.status,
    lastSeenAt: row.lastIngestedAt,
    lastContent: row.lastContent,
  }
}

function buildTopicTree(events: StoredEvent[]): TopicNode[] {
  type MutableNode = TopicNode & { childrenMap: Map<string, MutableNode> }
  const root: MutableNode = {
    id: 'root',
    name: 'root',
    path: '',
    count: 0,
    children: [],
    childrenMap: new Map(),
  }

  for (const event of events) {
    root.count += 1
    let cursor = root
    let partial = ''
    for (const segment of event.segments) {
      partial = partial ? `${partial}/${segment}` : segment
      let child = cursor.childrenMap.get(segment)
      if (!child) {
        child = {
          id: partial,
          name: segment,
          path: partial,
          count: 0,
          children: [],
          childrenMap: new Map(),
        }
        cursor.childrenMap.set(segment, child)
        cursor.children.push(child)
      }
      child.count += 1
      cursor = child
    }
  }

  const finalize = (nodes: MutableNode[]): TopicNode[] =>
    nodes
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map(({ childrenMap: _childrenMap, children, ...rest }) => ({
        ...rest,
        children: finalize(children as MutableNode[]),
      }))

  return finalize(root.children as MutableNode[])
}

function parsePublishPayload(payload: unknown) {
  const result = publishSchema.safeParse(payload)
  if (!result.success) {
    console.error('[EventStore] Schema validation failed:', result.error.format())
    throw new Error(
      `Schema validation failed: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`,
    )
  }
  return result.data
}

export async function appendEvent(topicPath: string, payload: unknown): Promise<StoredEvent> {
  const parsedTopic = normalizeTopicPath(topicPath)
  if (!parsedTopic) {
    throw new Error('Path is required')
  }

  const segments = splitTopicPath(parsedTopic)
  const parsedPayload = parsePublishPayload(payload)
  const volume = normalizeVolume(typeof (payload as any)?.volume === 'string' ? (payload as any).volume : undefined)
  const status = normalizeEventStatus(parsedPayload.status)
  const time = parsedPayload.time ?? nowIso()
  const ingestedAt = nowIso()
  const event: StoredEvent = {
    id: randomId('evt'),
    volume,
    path: parsedTopic,
    segments,
    time,
    ingestedAt,
    status,
    content: parsedPayload.content,
    entityId: segments[segments.length - 1] || parsedTopic,
    entityType: 'path',
  }

  const store = await ensureStoreFile()
  ensureDefaultVolume(store.volumes, volume)
  store.events.push(event)
  if (store.events.length > MAX_STORED_EVENTS) {
    store.events = store.events.slice(-MAX_STORED_EVENTS)
  }
  upsertPathSnapshot(store.paths, event)
  await saveStoreFile(store)
  return event
}

export async function getDashboardSnapshot(filters: DashboardFilters = {}): Promise<DashboardSnapshot> {
  const store = await ensureStoreFile()
  const filteredEvents = store.events.filter((event) => eventMatchesFilters(event, filters))
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500)
  const events = [...filteredEvents]
    .sort((a, b) => b.time.localeCompare(a.time) || b.ingestedAt.localeCompare(a.ingestedAt))
    .slice(0, limit)

  const paths = [...store.paths]
    .filter((row) => pathMatchesFilters(row, filters))
    .sort((a, b) => {
      const rank = pathStatusRank(a.status) - pathStatusRank(b.status)
      if (rank !== 0) return rank
      return b.lastIngestedAt.localeCompare(a.lastIngestedAt)
    })

  const topicTree = buildTopicTree(filteredEvents)
  const busyCount = paths.filter((row) => row.status === 'busy').length
  const idleCount = paths.filter((row) => row.status === 'idle').length
  const entities = paths.map(toEntityCompat)

  return {
    events,
    paths,
    entities,
    topicTree,
    stats: {
      totalEvents: filteredEvents.length,
      pathCount: paths.length,
      busyCount,
      idleCount,
    },
    fetchedAt: nowIso(),
  }
}

export async function getStatusSnapshot(topicPrefix?: string, volume?: string) {
  return getDashboardSnapshot({ topicPrefix, volume, limit: 200 })
}

export async function clearAll() {
  const store = await ensureStoreFile()
  const eventCount = store.events.length
  const pathCount = store.paths.length
  store.events = []
  store.paths = []
  await saveStoreFile(store)
  return { success: true, deletedEvents: eventCount, deletedEntities: pathCount }
}
