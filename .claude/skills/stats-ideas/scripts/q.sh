#!/usr/bin/env bash
# Runs psql against this worktree's own stack database, read-only by default
# and with a statement timeout. It takes DATABASE_URL from the block `otr up`
# writes into the root .env and refuses the developer's database on 5432, so
# an exploratory query can't touch the main checkout's data or write to the
# stack by accident.
#
# Usage: q.sh -c "select ..."   or   q.sh -f query.sql   (any psql arguments)
# Set Q_TIMEOUT to change the per-statement timeout (default 60s).
set -euo pipefail

root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
env_file=$root/.env
marker='# >>> otr stack'

url=$(awk -v m="$marker" 'index($0, m) == 1 { inblock = 1; next }
  inblock && /^DATABASE_URL=/ { sub(/^DATABASE_URL=/, ""); print; exit }' \
  "$env_file" 2>/dev/null || true)

if [[ -z $url ]]; then
  echo "q.sh: no otr stack in $env_file; run apps/scripts/otr up --no-web" >&2
  exit 1
fi

port=$(sed -E 's#^.*@[^:/]+:([0-9]+)/.*$#\1#' <<<"$url")
if [[ $port == 5432 || $port == 5433 || ! $port =~ ^[0-9]+$ ]]; then
  echo "q.sh: refusing port '$port'; only an otr stack database is allowed" >&2
  exit 1
fi

export PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=${Q_TIMEOUT:-60s}"
exec psql "$url" -X -v ON_ERROR_STOP=1 -P pager=off "$@"
