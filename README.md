# Tailwatch

Tailwatch is a realtime event monitor for teams that need fast visibility across agents, jobs, services, pipelines, and message streams.

It is designed for the gap between raw logs and heavyweight observability platforms: simple enough to adopt quickly, but structured enough to answer what is happening right now.

## Why Tailwatch

When multiple systems emit events, teams usually lose context before they lose data.

Common questions become harder than they should be:

- What is active right now?
- What failed, and where did it fail?
- Which project, workflow, or team does this event belong to?
- Did a run finish, stall, or go idle?

Tailwatch gives you a single live surface for event streams and current state.

## What It Does

Tailwatch lets clients publish events to a path-based namespace, then turns those events into two complementary views:

- Log Stream: a live timeline of events (good for debugging and tracing activity)
- Status Board: a derived snapshot of current entity state (good for triage and operations)

This makes it useful both as a lightweight monitoring layer and as an operational wallboard.

## Core Concepts

### Hierarchical Topics

Events are published into a hierarchy defined by the topic path.

Examples:

- `/team-a/project-x/task/planner`
- `/team-a/project-y/pipeline/ingest`
- `/ops/cron/nightly-backup`
- `/app/frontend/messages`

These paths become filterable namespaces in the dashboard.

### Event Stream + Derived State

Tailwatch stores and streams raw events in realtime, while also deriving current status per entity.

That means you can move between:

- the timeline (what happened)
- the snapshot (what is happening now)

### Workspace Separation

Tailwatch supports workspace scoping so teams can keep environments or organizations separated while using the same event model.

## Event Types

Tailwatch supports a small, practical event model for operational streams:

- `start` — work begins
- `log` — message or progress output
- `stop` — work finishes successfully
- `error` — work fails
- `heartbeat` — keepalive for long-running work
- `status` — explicit state update

This model works well for agents, background jobs, services, and general application events.

## Current Capabilities

- Realtime event streaming dashboard
- Status board with derived entity state
- Hierarchical topic filtering
- Search and event-type filtering
- Workspace-aware monitoring views
- Browser sound alerts and push notifications (optional)
- Lightweight HTTP publish pattern for event ingestion

## Typical Use Cases

- AI/agent orchestration workflows
- CI/CD and deployment pipelines
- Background workers and scheduled jobs
- Ops/infra checks and cron tasks
- Internal app message streams and activity feeds

## Product Principles

- Fast to adopt: simple publish model, minimal ceremony
- Operator-friendly: timeline + current-state views
- Structured but flexible: hierarchy without heavy schema requirements
- Useful early: provides value before a full observability rollout

## Roadmap Direction

Tailwatch is focused on becoming a stronger operational signal layer for realtime workstreams.

Planned and likely next areas include:

- richer run and timeline detail views
- topic-focused shared views
- access control and publish/read permissions
- webhooks for key events (for example failures)
- retention controls and policies
- summary metrics and trend visualizations

## Project Status

Tailwatch is currently a private project.

This README describes the product intent, current capabilities, and direction. Details may evolve as the product matures.
