#!/bin/bash

# Simple script to seed the Tailwatch DB with some initial data using the publish endpoint
# Usage: ./seed-db.sh [BASE_URL]
# Default BASE_URL is http://localhost:3000

BASE_URL=${1:-"http://localhost:3000"}
VOLUME="personal"

publish() {
  local path=$1
  local payload=$2
  echo "Publishing to $path..."
  curl -X POST "$BASE_URL/api/publish/$path" \
    -H "Content-Type: application/json" \
    -H "x-tailwatch-volume: $VOLUME" \
    -d "$payload"
  echo -e "\n"
}

# 1. AI Agent Workflows
publish "agents/researcher/run_42" '{"type":"start", "runId":"task_42", "entityId":"researcher", "status":"busy", "content":"Starting research on autonomous agents"}'
sleep 1
publish "agents/researcher/run_42" '{"type":"message", "runId":"task_42", "entityId":"researcher", "content":"Searching Arxiv for recent papers..."}'
sleep 1
publish "agents/researcher/run_42" '{"type":"message", "runId":"task_42", "entityId":"researcher", "content":"Found 12 relevant papers. Synthesizing results."}'
sleep 1
publish "agents/researcher/run_42" '{"type":"stop", "runId":"task_42", "entityId":"researcher", "status":"idle", "content":"Research complete. Waiting for human review."}'

# 2. CI/CD Pipeline
publish "dev/pipelines/webapp-build" '{"type":"start", "runId":"wf_101", "entityId":"build-step", "status":"busy", "content":"Compiling TypeScript assets..."}'
sleep 1
publish "dev/pipelines/webapp-build" '{"type":"stop", "runId":"wf_101", "entityId":"build-step", "status":"idle", "content":"Build complete. Ready for manual deployment approval."}'

# 3. Background Jobs
publish "ops/db/backup" '{"type":"start", "runId":"cron_daily", "entityId":"postgres-dump", "status":"busy", "content":"Streaming dump to S3..."}'
sleep 1
publish "ops/db/backup" '{"type":"stop", "runId":"cron_daily", "entityId":"postgres-dump", "status":"idle", "content":"Backup verified (2.4GB)"}'

# 4. Human-in-the-Loop Approval
publish "workflow/approvals/invoice_99" '{"status":"idle", "content":"Invoice #99 submitted. Waiting for Finance review."}'

echo "Seeding complete!"
