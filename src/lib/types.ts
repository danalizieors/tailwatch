export type EventType = 'start' | 'log' | 'stop' | 'error' | 'heartbeat' | 'status'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type EntityStatus = 'working' | 'stopped' | 'error' | 'idle' | 'unknown'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface PublishEventPayload {
  type: EventType
  timestamp?: string
  runId?: string
  entityId?: string
  entityType?: string
  level?: LogLevel
  status?: string
  content?: string
  meta?: Record<string, JsonValue>
  metrics?: Record<string, number>
}

export interface StoredEvent extends PublishEventPayload {
  id: string
  workspace: string
  path: string
  segments: string[]
  timestamp: string
  ingestedAt: string
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

export interface TopicNode {
  id: string
  name: string
  path: string
  count: number
  children: TopicNode[]
}

export interface DashboardStats {
  totalEvents: number
  entityCount: number
  activeCount: number
  errorCount: number
}

export interface DashboardSnapshot {
  events: StoredEvent[]
  entities: EntitySnapshot[]
  topicTree: TopicNode[]
  stats: DashboardStats
  fetchedAt: string
}
