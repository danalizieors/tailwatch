import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { DashboardSnapshot, EntitySnapshot, EntityStatus, PublishEventPayload, StoredEvent, TopicNode } from '~/lib/types'

const STORE_DIR = path.join(process.cwd(), 'data')
const STORE_FILE = path.join(STORE_DIR, 'events.json')
const MAX_STORED_EVENTS = 5_000

const publishSchema = z.object({
  type: z.enum(['start', 'log', 'stop', 'error', 'heartbeat', 'status']),
  timestamp: z.string().datetime().optional(),
  runId: z.string().min(1).max(200).optional(),
  entityId: z.string().min(1).max(200).optional(),
  entityType: z.string().min(1).max(100).optional(),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  status: z.string().min(1).max(100).optional(),
  content: z.string().max(10_000).optional(),
  // Legacy alias for pre-rename clients.
  message: z.string().max(10_000).optional(),
  meta: z.record(z.string(), z.any()).optional(),
  metrics: z.record(z.string(), z.number()).optional(),
})

const fileSchema = z.object({
  version: z.literal(1),
  events: z.array(z.unknown()),
})

type StoreFile = {
  version: 1
  events: StoredEvent[]
}

export interface DashboardFilters {
  workspace?: string
  topicPrefix?: string
  type?: string
  q?: string
  limit?: number
}

function nowIso() {
  return new Date().toISOString()
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeTopicPath(value: string) {
  return value.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function splitTopicPath(topicPath: string) {
  const clean = normalizeTopicPath(topicPath)
  return clean ? clean.split('/').filter(Boolean) : []
}

function normalizeStoredEvent(raw: unknown): StoredEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>

  const pathValue =
    typeof value.path === 'string'
      ? value.path
      : typeof value.topicPath === 'string'
        ? value.topicPath
        : ''

  if (!pathValue || typeof value.type !== 'string') return null

  const timestamp =
    typeof value.timestamp === 'string' && value.timestamp ? value.timestamp : nowIso()
  const ingestedAt =
    typeof value.ingestedAt === 'string' && value.ingestedAt ? value.ingestedAt : timestamp

  const path = normalizeTopicPath(pathValue)
  const content =
    typeof value.content === 'string'
      ? value.content
      : typeof value.message === 'string'
        ? value.message
        : undefined

  return {
    id: typeof value.id === 'string' ? value.id : randomId('evt'),
    workspace: typeof value.workspace === 'string' ? value.workspace : 'default',
    path,
    segments:
      Array.isArray(value.segments) && value.segments.every((segment) => typeof segment === 'string')
        ? (value.segments as string[])
        : splitTopicPath(path),
    type: value.type as StoredEvent['type'],
    timestamp,
    ingestedAt,
    runId: typeof value.runId === 'string' ? value.runId : undefined,
    entityId: typeof value.entityId === 'string' ? value.entityId : undefined,
    entityType: typeof value.entityType === 'string' ? value.entityType : undefined,
    level: value.level as StoredEvent['level'],
    status: typeof value.status === 'string' ? value.status : undefined,
    content,
    meta: (value.meta as StoredEvent['meta']) ?? undefined,
    metrics: (value.metrics as StoredEvent['metrics']) ?? undefined,
  }
}

async function ensureStoreFile() {
  await mkdir(STORE_DIR, { recursive: true })
  try {
    const raw = await readFile(STORE_FILE, 'utf8')
    const parsed = fileSchema.safeParse(JSON.parse(raw))
    if (parsed.success) {
      const normalizedEvents = parsed.data.events
        .map((event) => normalizeStoredEvent(event))
        .filter((event): event is StoredEvent => event !== null)

      const normalized: StoreFile = {
        version: 1,
        events: normalizedEvents,
      }

      // Persist migrated shape (`path`/`content`) so future loads are cheap.
      if (JSON.stringify(parsed.data.events) !== JSON.stringify(normalized.events)) {
        await saveStoreFile(normalized)
      }

      return normalized
    } else {
      console.error('[EventStore] Validation failed for events.json:', parsed.error)
    }
  } catch (err) {
    if ((err as any).code !== 'ENOENT') {
      console.error('[EventStore] Error reading events.json:', err)
    }
    // Seed file below.
  }

  const seed: StoreFile = { version: 1, events: createSeedEvents() }
  await writeFile(STORE_FILE, JSON.stringify(seed, null, 2), 'utf8')
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
      path: 'team-a/project-x/task/planner',
      payload: {
        type: 'start',
        runId: 'run_planner_1',
        entityId: 'planner',
        entityType: 'task',
        content: 'Planning deployment',
      },
    },
    {
      offsetMs: 7 * 60_000 + 20_000,
      path: 'team-a/project-x/task/planner',
      payload: {
        type: 'log',
        level: 'info',
        runId: 'run_planner_1',
        entityId: 'planner',
        entityType: 'task',
        content: 'Collected build metadata',
      },
    },
    {
      offsetMs: 6 * 60_000,
      path: 'team-a/project-x/task/planner',
      payload: {
        type: 'stop',
        status: 'success',
        runId: 'run_planner_1',
        entityId: 'planner',
        entityType: 'task',
        content: 'Plan finished',
      },
    },
    {
      offsetMs: 5 * 60_000,
      path: 'ops/cron/nightly-backup',
      payload: {
        type: 'start',
        runId: 'backup_20260224',
        entityId: 'nightly-backup',
        entityType: 'job',
        content: 'Backup job started',
      },
    },
    {
      offsetMs: 4 * 60_000 + 35_000,
      path: 'ops/cron/nightly-backup',
      payload: {
        type: 'heartbeat',
        runId: 'backup_20260224',
        entityId: 'nightly-backup',
        entityType: 'job',
        content: '35% complete',
      },
    },
    {
      offsetMs: 3 * 60_000 + 10_000,
      path: 'ops/cron/nightly-backup',
      payload: {
        type: 'error',
        runId: 'backup_20260224',
        entityId: 'nightly-backup',
        entityType: 'job',
        content: 'Disk quota exceeded',
      },
    },
    {
      offsetMs: 2 * 60_000 + 15_000,
      path: 'app/frontend/messages',
      payload: {
        type: 'log',
        level: 'warn',
        content: 'Client retried websocket connection',
      },
    },
    {
      offsetMs: 75_000,
      path: 'team-b/pipeline/ingest',
      payload: {
        type: 'status',
        status: 'idle',
        entityId: 'ingest',
        entityType: 'pipeline',
        content: 'Waiting for next batch',
      },
    },
  ]

  return rows.map((row, index) => {
    const timestamp = new Date(now - row.offsetMs).toISOString()
    return {
      id: `seed_${index + 1}`,
      workspace: 'default',
      path: normalizeTopicPath(row.path),
      segments: splitTopicPath(row.path),
      timestamp,
      ingestedAt: timestamp,
      ...row.payload,
    }
  })
}

function eventMatchesFilters(event: StoredEvent, filters: DashboardFilters) {
  if (filters.workspace) {
    if (event.workspace !== filters.workspace) return false
  } else if (event.workspace !== 'default') {
    // If no workspace requested, default to 'default' workspace only
    return false
  }

  if (filters.topicPrefix) {
    const prefix = normalizeTopicPath(filters.topicPrefix)
    if (!event.path.startsWith(prefix)) return false
  }
  if (filters.type && filters.type !== 'all') {
    if (event.type !== filters.type) return false
  }
  if (filters.q) {
    const q = filters.q.toLowerCase()
    const haystack = `${event.path} ${event.content ?? ''} ${event.entityId ?? ''} ${event.runId ?? ''}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

function getEntityStatusFromEvent(event: StoredEvent, previous?: EntitySnapshot): EntityStatus {
  if (event.type === 'start') return 'working'
  if (event.type === 'heartbeat') return previous?.currentStatus === 'error' ? 'error' : 'working'
  if (event.type === 'stop') return 'stopped'
  if (event.type === 'error') return 'error'
  if (event.type === 'status') {
    const normalized = (event.status ?? '').toLowerCase()
    if (normalized === 'working' || normalized === 'running' || normalized === 'busy') return 'working'
    if (normalized === 'idle') return 'idle'
    if (normalized === 'error' || normalized === 'failed') return 'error'
    if (normalized === 'stopped' || normalized === 'success' || normalized === 'done') return 'stopped'
  }
  return previous?.currentStatus ?? 'unknown'
}

function buildEntitySnapshots(events: StoredEvent[]) {
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const map = new Map<string, EntitySnapshot>()

  for (const event of sorted) {
    const entityId = event.entityId ?? event.runId ?? event.path
    const entityType = event.entityType ?? (event.runId ? 'run' : event.entityId ? 'entity' : 'topic')
    const key = `${event.path}::${entityId}`
    const previous = map.get(key)
    const currentStatus = getEntityStatusFromEvent(event, previous)
    const startedAt =
      event.type === 'start'
        ? event.timestamp
        : currentStatus === 'working'
          ? previous?.startedAt ?? event.timestamp
          : previous?.startedAt

    const next: EntitySnapshot = {
      key,
      workspace: event.workspace,
      path: event.path,
      entityId,
      entityType,
      currentStatus,
      currentRunId: event.runId ?? previous?.currentRunId,
      startedAt: currentStatus === 'working' ? startedAt : previous?.startedAt,
      lastSeenAt: event.timestamp,
      lastEventType: event.type,
      lastContent: event.content ?? previous?.lastContent,
      lastError: event.type === 'error' ? event.content ?? 'Error' : previous?.lastError,
      activeForMs:
        currentStatus === 'working' && startedAt
          ? Math.max(0, Date.now() - new Date(startedAt).getTime())
          : undefined,
    }

    if (currentStatus === 'stopped' || currentStatus === 'idle' || currentStatus === 'error') {
      next.startedAt = undefined
      next.activeForMs = undefined
    }

    map.set(key, next)
  }

  return [...map.values()].sort((a, b) => {
    const order = statusRank(a.currentStatus) - statusRank(b.currentStatus)
    if (order !== 0) return order
    return b.lastSeenAt.localeCompare(a.lastSeenAt)
  })
}

function statusRank(status: EntityStatus) {
  switch (status) {
    case 'error':
      return 0
    case 'working':
      return 1
    case 'idle':
      return 2
    case 'stopped':
      return 3
    default:
      return 4
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

export async function appendEvent(topicPath: string, payload: unknown): Promise<StoredEvent> {
  const parsedTopic = normalizeTopicPath(topicPath)
  if (!parsedTopic) {
    throw new Error('Topic path is required')
  }

  const result = publishSchema.safeParse(payload)
  if (!result.success) {
    console.error('[EventStore] Schema validation failed:', result.error.format())
    throw new Error(`Schema validation failed: ${result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`)
  }
  const parsedPayload = result.data
  const { message: legacyMessage, ...payloadRest } = parsedPayload
  const workspace = (payload as any).workspace || 'default'
  const normalizedPayload: PublishEventPayload = {
    ...payloadRest,
    content: payloadRest.content ?? legacyMessage,
  }
  const timestamp = normalizedPayload.timestamp ?? nowIso()
  const event: StoredEvent = {
    id: randomId('evt'),
    workspace,
    path: parsedTopic,
    segments: splitTopicPath(parsedTopic),
    timestamp,
    ingestedAt: nowIso(),
    ...normalizedPayload,
  }

  const store = await ensureStoreFile()
  store.events.push(event)
  if (store.events.length > MAX_STORED_EVENTS) {
    store.events = store.events.slice(-MAX_STORED_EVENTS)
  }
  await saveStoreFile(store)
  return event
}

export async function getDashboardSnapshot(filters: DashboardFilters = {}): Promise<DashboardSnapshot> {
  const store = await ensureStoreFile()
  const filteredEvents = store.events.filter((event) => eventMatchesFilters(event, filters))
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500)
  const events = [...filteredEvents]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)

  const entities = buildEntitySnapshots(filteredEvents)
  const topicTree = buildTopicTree(filteredEvents)

  return {
    events,
    entities,
    topicTree,
    stats: {
      totalEvents: filteredEvents.length,
      entityCount: entities.length,
      activeCount: entities.filter((row) => row.currentStatus === 'working').length,
      errorCount: entities.filter((row) => row.currentStatus === 'error').length,
    },
    fetchedAt: nowIso(),
  }
}

export async function getStatusSnapshot(topicPrefix?: string, workspace?: string) {
  return getDashboardSnapshot({ topicPrefix, workspace, limit: 200 })
}

export async function clearAll() {
  const store = await ensureStoreFile()
  const eventCount = store.events.length
  store.events = []
  await saveStoreFile(store)
  return { success: true, deletedEvents: eventCount, deletedEntities: 0 }
}
