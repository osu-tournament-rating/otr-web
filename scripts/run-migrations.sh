#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules ] || [ ! -d node_modules/pg ]; then
  bun install --frozen-lockfile
fi

exec bunx drizzle-kit push
