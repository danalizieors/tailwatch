#!/bin/bash

# Seed the Tailwatch DB with Markdown-rich event content
# Usage: ./seed-markdown.sh [BASE_URL]

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

# 1. Multi-step research task with a data table
publish "agents/planner" '{"status":"busy", "content":"Plan for **Project Alpha** synthesis:\n\n| Step | Description | Status |\n| :--- | :--- | :--- |\n| 1 | Research | Active |\n| 2 | Drafting | Waiting |\n| 3 | Review | Pending |"}'

# 2. System update log with code blocks
publish "system/updates" '{"status":"idle", "content":"**Update complete**: Version `1.4.2` deployed. Waiting for human verification."}'

# 3. Security scan with formatted highlights
publish "security/audit" '{"status":"busy", "content":"Security audit in progress. Reviewing open ports.\n\n> [!IMPORTANT]\n> Manual confirmation required for external exposure on port `8080`."}'

# 4. Process checklist
publish "ops/deploy/backend" '{"status":"busy", "content":"Deployment checklist:\n- [x] Pre-flight checks\n- [ ] Database migration (Waiting for human input)\n- [ ] Asset rollout"}'

echo "Markdown seeding complete!"
