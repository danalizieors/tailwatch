export type EventStatus = 'busy' | 'idle'

// Legacy compatibility for parts of the UI that still reference event "types".
export type EventType = 'start' | 'log' | 'stop' | 'error' | 'heartbeat' | 'status'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type EntityStatus = EventStatus | 'working' | 'stopped' | 'error' | 'unknown'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface PublishEventPayload {
  time?: string
  status?: EventStatus | string
  content?: string

  // Legacy ingest aliases tolerated during migration.
  timestamp?: string
  message?: string
  type?: string
  level?: LogLevel
  runId?: string
  entityId?: string
  entityType?: string
  meta?: Record<string, JsonValue>
  metrics?: Record<string, number>
}

export interface StoredEvent {
  id: string
  workspace: string
  path: string
  segments: string[]
  time: string
  // Alias kept for existing UI code until it is fully migrated.
  timestamp: string
  ingestedAt: string
  status: EventStatus
  content?: string
  pathId?: string
  submittedPath?: string

  // Legacy compatibility fields for the existing log UI.
  type?: EventType
  runId?: string
  entityId?: string
  entityType?: string
  level?: LogLevel
  meta?: Record<string, JsonValue>
  metrics?: Record<string, number>
}

export interface PathSnapshot {
  key: string
  workspace: string
  path: string
  segments: string[]
  status: EventStatus
  lastTime: string
  lastIngestedAt: string
  // Alias kept for existing UI code until it is fully migrated.
  lastSeenAt: string
  lastContent?: string
}

export interface EntitySnapshot {
  key: string
  workspace: string
  path: string
  entityId: string
  entityType: string
  currentStatus: EntityStatus
  currentRunId?: string
  startedAt?: string
  lastSeenAt: string
  lastEventType: EventType
  lastContent?: string
  lastError?: string
  activeForMs?: number
}

export interface VolumeRecord {
  id: string
  slug: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface BindingRecord {
  id: string
  workspace: string
  route: string
  targetPath: string
  keyHash: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface TopicNode {
  id: string
  name: string
  path: string
  count: number
  children: TopicNode[]
}

export interface DashboardStats {
  totalEvents: number
  pathCount: number
  busyCount: number
  idleCount: number

  // Legacy aliases preserved for current UI wiring.
  entityCount: number
  activeCount: number
  errorCount: number
}

export interface DashboardSnapshot {
  events: StoredEvent[]
  paths: PathSnapshot[]
  entities: EntitySnapshot[]
  topicTree: TopicNode[]
  stats: DashboardStats
  fetchedAt: string
}
