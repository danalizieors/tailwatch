# Tailwatch

Tailwatch is a lightweight realtime dashboard for tracking hierarchical events, tasks, and simple messages.

Think of it like `ntfy`, but optimized for live streams plus optional status tracking (agents are just one example):

- clients post events to a URL path (which defines a hierarchy)
- the app stores and streams those events in realtime
- users can monitor activity in two modes:
  - log stream mode (like traditional logs)
  - status board mode (what is working, stopped, failed, idle)

## What This Solves

When many things are emitting events (LLM tasks, jobs, services, pipelines, or simple app messages), it is hard to answer:

- What is active right now?
- When did a run start and stop?
- Which hierarchy/group/project does an event belong to?
- Where did something fail?

Tailwatch provides a single dashboard with a simple HTTP posting pattern.

## Planned Stack (v1)

- Frontend: `TanStack Start`
- UI: `Tailwind CSS` + `shadcn/ui`
- Backend: `Convex` (default)

Why Convex fits well:

- realtime subscriptions for live dashboards
- simple data model + mutations/queries
- good fit for append-only event streams and derived status snapshots

Possible fallback if needed:

- Postgres + WebSocket/SSE (if write/query patterns outgrow Convex constraints)

## Core Concept

Events are posted to a path that defines the hierarchy being monitored.

Example hierarchy:

- `/team-a/project-x/task/planner`
- `/team-a/project-x/task/coder`
- `/team-a/project-y/pipeline/ingest`
- `/ops/cron/nightly-backup`
- `/app/frontend/messages`

This path becomes a filterable namespace in the dashboard.

## Event Ingestion API (Draft)

### URL Pattern

`POST /api/publish/*path`

Examples:

- `POST /api/publish/team-a/project-x/task/planner`
- `POST /api/publish/team-a/project-x/run/abc123`

### Event Types (MVP)

- `start` — a task/job/process started work
- `log` — normal log line or structured message
- `stop` — a task/job/process finished successfully
- `error` — something failed
- `heartbeat` — optional keepalive for long-running work
- `status` — explicit state update (`working`, `idle`, `stopped`, etc.)

For simple message-only use cases, `log` events can be posted without `runId` or `entityId`.

Simplified event schema (required core fields):

- `path` (derived from the publish URL path)
- `type`
- `content`

### Example Payloads

#### Start

```json
{
  "type": "start",
  "runId": "run_123",
  "entityId": "planner",
  "entityType": "task",
  "content": "Planning task",
  "timestamp": "2026-02-24T12:00:00Z",
  "meta": {
    "model": "gpt-5",
    "taskId": "task_42"
  }
}
```

#### Log

```json
{
  "type": "log",
  "runId": "run_123",
  "entityId": "planner",
  "entityType": "task",
  "level": "info",
  "content": "Fetched repository files",
  "timestamp": "2026-02-24T12:00:05Z"
}
```

#### Stop

```json
{
  "type": "stop",
  "runId": "run_123",
  "entityId": "planner",
  "entityType": "task",
  "status": "success",
  "content": "Plan completed",
  "timestamp": "2026-02-24T12:00:30Z",
  "metrics": {
    "durationMs": 30000
  }
}
```

## Dashboard Modes

### 1) Log Stream Mode

Purpose: behave like a logging UI.

Features:

- live event stream
- filters by topic path / entity / run / level / type
- time ordering
- search in content
- collapse/expand structured metadata

### 2) Status Board Mode

Purpose: quickly see current state of each tracked entity (task, agent, job, service, etc.).

Features:

- one row/card per entity (or per `path + entityId`)
- current status: `working`, `stopped`, `error`, `idle`, `unknown`
- last seen timestamp
- current run id
- duration since started (if active)
- last content / last error

Derived state is computed from the latest relevant events (`start`, `heartbeat`, `stop`, `error`, `status`).

## Data Model (Conceptual)

### `events` (append-only)

- `id`
- `path` (e.g. `team-a/project-x/task/planner`)
- `segments` (array for hierarchical filtering)
- `type`
- `timestamp`
- `runId`
- `entityId` (optional)
- `entityType` (optional)
- `level`
- `content`
- `meta` (JSON)

### `entity_state` (derived / materialized)

- `key` (e.g. `path + entityId`)
- `entityId`
- `entityType`
- `path`
- `currentStatus`
- `currentRunId`
- `startedAt`
- `lastSeenAt`
- `lastEventType`
- `lastContent`
- `lastError`

## UI Outline (TanStack Start + shadcn)

### Pages

- `/` — dashboard (default to log stream)
- `/status` — status board mode
- `/topics/*path` — filtered view by hierarchy path
- `/runs/:runId` — run detail timeline (optional in MVP)

### Main Components

- `AppShell`
- `TopicTree` (hierarchy navigation)
- `LogStreamTable` / `LogStreamList`
- `StatusBoardGrid`
- `FiltersBar`
- `EventDetailDrawer`

## Security / Access (Later)

- anonymous publish token per topic namespace
- read-only dashboard auth
- rate limiting for public endpoints

## MVP Scope

1. Ingest events via `POST /api/publish/*path`
2. Store events in Convex
3. Realtime log stream dashboard
4. Derived status board dashboard
5. Basic filtering by topic path and entity id

## Nice-to-Have (After MVP)

- SSE/WebSocket ingestion option
- CLI tool (`tailwatch publish ...`)
- webhooks on failure/stop
- retention policies
- metrics charts (counts, durations, failures)
- multi-tenant auth model

## Example Usage (cURL)

```bash
curl -X POST http://localhost:3000/api/publish/team-a/project-x/task/planner \
  -H "Content-Type: application/json" \
  -d '{
    "type":"start",
    "runId":"run_123",
    "entityId":"planner",
    "entityType":"task",
    "content":"Starting plan",
    "timestamp":"2026-02-24T12:00:00Z"
  }'
```

```bash
curl -X POST http://localhost:3000/api/publish/team-a/project-x/task/planner \
  -H "Content-Type: application/json" \
  -d '{
    "type":"stop",
    "runId":"run_123",
    "entityId":"planner",
    "entityType":"task",
    "status":"success",
    "content":"Finished",
    "timestamp":"2026-02-24T12:00:30Z"
  }'
```

## Implementation Notes (Next Step)

Recommended next step: scaffold TanStack Start + Tailwind + shadcn, then wire Convex with:

- an HTTP endpoint for publish
- a query for log streaming
- a query for status board data
- a mutation/action to upsert derived state on event ingestion

---

This README is the initial product + technical blueprint for the first build.

## Running With Convex (Real Backend)

The app can run in two modes:

- local demo mode (JSON file storage) when no Convex URL is configured
- Convex mode (real backend) when `CONVEX_URL` or `VITE_CONVEX_URL` is set

### Setup

1. Start Convex dev in a separate terminal:
   - `pnpm convex:dev`
2. Add the Convex URL to `.env.local` (see `.env.example`)
3. Start the app:
   - `pnpm dev`

When Convex is configured, the existing endpoints (`/api/publish/*path`, `/api/dashboard`, `/api/status`) use Convex automatically.
