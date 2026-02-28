export type EventStatus = 'busy' | 'idle'

export type EntityStatus = EventStatus

export interface PublishEventPayload {
  time?: string
  status?: EventStatus | string
  content?: string
}

export interface StoredEvent {
  id: string
  volume: string
  path: string
  segments: string[]
  time: string
  ingestedAt: string
  status: EventStatus
  content?: string
  pathId?: string
  submittedPath?: string
  entityId?: string
  entityType?: string
}

export interface PathSnapshot {
  key: string
  volume: string
  path: string
  segments: string[]
  status: EventStatus
  lastTime: string
  lastIngestedAt: string
  lastContent?: string
}

export interface EntitySnapshot {
  key: string
  volume: string
  path: string
  entityId: string
  entityType: string
  currentStatus: EntityStatus
  lastSeenAt: string
  lastContent?: string
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
  volume: string
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
}

export interface DashboardSnapshot {
  events: StoredEvent[]
  paths: PathSnapshot[]
  entities: EntitySnapshot[]
  topicTree: TopicNode[]
  stats: DashboardStats
  fetchedAt: string
}
