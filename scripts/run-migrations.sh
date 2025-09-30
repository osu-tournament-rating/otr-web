#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! bun -e "import('pg')" >/dev/null 2>&1; then
  bun install --frozen-lockfile
fi

exec bun run scripts/run-migrations.ts
