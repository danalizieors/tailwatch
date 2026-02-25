#!/bin/bash

# Default host
HOST=${1:-"http://localhost:3000"}

echo "--- Seeding Tailwatch Markdown Events ---"
echo "Target: $HOST"

function publish() {
  local path=$1
  local payload=$2
  echo ">> Publishing to $path"
  curl -s -X POST "$HOST/api/publish/$path" -H "Content-Type: application/json" -d "$payload"
  echo ""
}

# Markdown-style logs
publish "system/updates" '{"type":"log", "level":"info", "content":"**Update successful**: Version `1.4.2` deployed."}'
publish "docs/build" '{"type":"log", "level":"info", "content":"Building documentation:\n- [x] API Reference\n- [ ] Tutorials\n- [ ] Guides"}'
publish "security/audit" '{"type":"error", "level":"error", "content":"Critical vulnerability found in `openssl` package!\n\n```bash\n# Recommended action:\napt-get update && apt-get upgrade\n```"}'
publish "agents/writer" '{"type":"log", "level":"info", "content":"Drafting post: # The Future of AI Monitoring\n\nTailwatch is the *best* tool for the job."}'

echo "--- Seeding Complete ---"
