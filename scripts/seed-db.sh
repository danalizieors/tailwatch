#!/bin/bash

# Default host
HOST=${1:-"http://localhost:3000"}

echo "--- Seeding Tailwatch Telemetry ---"
echo "Target: $HOST"

function publish() {
  local path=$1
  local payload=$2
  echo ">> Publishing to $path"
  curl -s -X POST "$HOST/api/publish/$path" \
    -H "Content-Type: application/json" \
    -d "$payload"
  echo ""
}

# 1. K8s Cluster Monitoring (Status based)
publish "k8s/cluster-01/nodes/node-1" '{"type":"status", "entityId":"node-1", "entityType":"node", "status":"working", "content":"Memory usage: 45%"}'
publish "k8s/cluster-01/nodes/node-2" '{"type":"status", "entityId":"node-2", "entityType":"node", "status":"working", "content":"Memory usage: 82%", "level":"warn"}'
publish "k8s/cluster-01/nodes/node-3" '{"type":"status", "entityId":"node-3", "entityType":"node", "status":"idle", "content":"Scheduled maintenance"}'

# 2. CI/CD Pipeline (Workflow based)
publish "dev/pipelines/webapp-build" '{"type":"start", "runId":"wf_101", "entityId":"build-step", "entityType":"job", "content":"Starting webpack build"}'
publish "dev/pipelines/webapp-build" '{"type":"log", "runId":"wf_101", "entityId":"build-step", "level":"info", "content":"Modules resolved: 1450"}'
publish "dev/pipelines/webapp-build" '{"type":"heartbeat", "runId":"wf_101", "entityId":"build-step", "content":"Minifying assets..."}'
publish "dev/pipelines/webapp-build" '{"type":"stop", "runId":"wf_101", "entityId":"build-step", "status":"success", "content":"Build complete in 45s"}'

# 3. LLM Agent Workflow (Complex hierarchy)
publish "agents/researcher/task/fetch-news" '{"type":"start", "runId":"task_42", "entityId":"fetcher", "entityType":"agent", "content":"Searching for AI news"}'
publish "agents/researcher/task/fetch-news" '{"type":"log", "runId":"task_42", "entityId":"fetcher", "content":"Querying Google Search API"}'
publish "agents/researcher/task/fetch-news" '{"type":"error", "runId":"task_42", "entityId":"fetcher", "content":"Rate limit reached for Search API", "meta":{"retryIn": 60}}'
publish "agents/researcher/task/fetch-news" '{"type":"heartbeat", "runId":"task_42", "entityId":"fetcher", "content":"Retrying in 5s"}'

# 4. IoT/Sensors (Simple logs)
publish "iot/office/temp-sensor" '{"type":"log", "level":"info", "content":"Temperature: 22.5C"}'
publish "iot/office/humidity-sensor" '{"type":"log", "level":"info", "content":"Humidity: 40%"}'

# 5. DB Backups (Cron style)
publish "ops/db/backup" '{"type":"start", "runId":"cron_daily", "entityId":"postgres-dump", "content":"Dumping database to S3"}'
publish "ops/db/backup" '{"type":"stop", "runId":"cron_daily", "entityId":"postgres-dump", "status":"success", "content":"Backup verified (2.4GB)"}'

echo "--- Seeding Complete ---"
