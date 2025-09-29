#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! bun -e "import('pg')" >/dev/null 2>&1; then
  bun install --frozen-lockfile
fi

# Verify the driver is available before running migrations.
bun -e "import('pg')" >/dev/null 2>&1

exec bunx drizzle-kit push
