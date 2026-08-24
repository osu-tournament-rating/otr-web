#!/usr/bin/env bash
set -euo pipefail

# Manages the shared dev-tier database that PR previews read from.
#
#   check          verify the live database is usable
#   restore        restore the dev replica into the seed, then rebuild live
#   clone <db>     create <db> from the seed, for PRs that add migrations
#   drop <db>      remove a cloned database
#
# Run from the dev tier directory, the one holding docker-compose.yml. Both
# workflows cd here first. Everything below can be overridden from the
# environment; the defaults describe the tier the workflows build.
#
# Two databases, never interchangeable: the seed is the restore target and
# stays idle so it can act as a template, and the live database is recreated
# from it and shared by every preview.

# The .env compose reads sits beside it and carries the postgres credentials.
# Sourcing it keeps them in one place rather than a second secret that has to
# be kept in step. Its keys are DOCKER_-prefixed, so nothing here collides.
if [[ -r .env ]]; then
  set -a
  . ./.env
  set +a
fi

# The workflows reach this over `ssh host bash -s`, a non-interactive shell,
# which reads neither ~/.profile nor the interactive half of ~/.bashrc. uv
# installs to ~/.local/bin and is on PATH only for a login shell, so restore
# cannot find it without this.
PATH="$HOME/.local/bin:$PATH"

CONTAINER="${DEV_DB_CONTAINER:-otr-dev-db}"
DB_USER="${DEV_DB_USER:-postgres}"
SEED_DB="${DEV_SEED_DB:-otr_dev_seed}"
LIVE_DB="${DEV_LIVE_DB:-otr_dev}"
OTR_SCRIPTS_DIR="${OTR_SCRIPTS_DIR:-/srv/otr-scripts}"
MAX_STALE_DAYS="${DEV_DB_MAX_STALE_DAYS:-14}"
EXPECTED_MIGRATIONS="${EXPECTED_MIGRATIONS:-}"
# staging-latest is rebuilt on every push to the default branch.
MIGRATION_IMAGE="${DEV_MIGRATION_IMAGE:-stagecodes/otr-web:staging-latest}"
NETWORK="${DEV_NETWORK:-otr-dev}"

# Minimum rows for the replica to be considered intact, set near half of
# current production so a truncated restore fails but ordinary drift does not.
ROW_FLOORS=(
  "players:50000"
  "tournaments:1500"
  "matches:75000"
  "games:500000"
  "game_scores:2000000"
  "rating_adjustments:2000000"
)

# The workflows pipe this script into `ssh host bash -s`, so stdin carries the
# rest of the script. Anything that reads stdin eats the lines after it.
query() { # query <database> <sql>
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$1" -tAc "$2" </dev/null
}

# Only the migration container needs a URL, and it dials over the otr-dev
# network, so the host is the container alias rather than localhost. Built on
# demand: drop and clone must still work when the password is not readable.
db_url() { # db_url <database>
  if [[ -n "${DEV_DB_URL_PREFIX:-}" ]]; then
    echo "${DEV_DB_URL_PREFIX}$1"
    return
  fi
  : "${DOCKER_POSTGRES_PASSWORD:?not set, and no .env beside the compose file to read it from}"
  echo "postgresql://${DB_USER}:${DOCKER_POSTGRES_PASSWORD}@${CONTAINER}:5432/$1"
}

fail() {
  echo "dev-db check failed: $1" >&2
  exit 1
}

database_exists() {
  [[ "$(query postgres "select 1 from pg_database where datname='$1'")" == "1" ]]
}

# DROP DATABASE and CREATE ... TEMPLATE both require zero connections.
disconnect() {
  query postgres "select pg_terminate_backend(pid) from pg_stat_activity
    where datname='$1' and pid <> pg_backend_pid()" >/dev/null
}

check() {
  docker exec "$CONTAINER" pg_isready -U "$DB_USER" >/dev/null 2>&1 ||
    fail "postgres is not accepting connections"

  database_exists "$LIVE_DB" || fail "database $LIVE_DB does not exist"

  if [[ -n "$EXPECTED_MIGRATIONS" ]]; then
    local applied
    applied="$(query "$LIVE_DB" 'select count(*) from drizzle.__drizzle_migrations')"
    [[ "$applied" == "$EXPECTED_MIGRATIONS" ]] ||
      fail "applied migrations $applied, expected $EXPECTED_MIGRATIONS"
  fi

  # A restore that dies partway still loads rows, so verify the constraints
  # that only get added once the data is fully in.
  local constraints
  constraints="$(query "$LIVE_DB" "select count(*) from pg_constraint
    where contype='f' and conrelid='matches'::regclass")"
  [[ "$constraints" -gt 0 ]] || fail "matches has no foreign keys; restore was incomplete"

  local entry table floor actual
  for entry in "${ROW_FLOORS[@]}"; do
    table="${entry%%:*}"
    floor="${entry##*:}"
    actual="$(query "$LIVE_DB" "select count(*) from $table")"
    [[ "$actual" -ge "$floor" ]] || fail "$table has $actual rows, expected at least $floor"
  done

  local stale
  stale="$(query "$LIVE_DB" "select coalesce(max(created), 'epoch') <
    now() - interval '$MAX_STALE_DAYS days' from matches")"
  [[ "$stale" == "f" ]] || fail "newest match is older than $MAX_STALE_DAYS days"

  echo "dev-db check passed"
}

restore() {
  echo "restoring $SEED_DB from the dev replica"
  # --db-only keeps this to the dev tier's own db container. The scoping that
  # keeps it off production lives in the otr-scripts .env: OTR_WEB_DIR must
  # point at the dev tier directory and DB_NAME at the seed.
  (cd "$OTR_SCRIPTS_DIR" && uv run python src/main.py \
    --script recovery --recovery-bucket dev --db-only </dev/null)

  database_exists "$SEED_DB" || fail "restore did not produce $SEED_DB"

  # The replica carries whatever schema production is on, which can trail the
  # default branch. Previews run branch code, so bring the seed forward before
  # anything clones from it.
  echo "migrating $SEED_DB"
  docker run --rm --network "$NETWORK" \
    -e DATABASE_URL="$(db_url "$SEED_DB")" \
    "$MIGRATION_IMAGE" ./scripts/run-migrations.sh </dev/null

  echo "rebuilding $LIVE_DB from $SEED_DB"
  disconnect "$LIVE_DB"
  query postgres "drop database if exists $LIVE_DB" >/dev/null
  disconnect "$SEED_DB"
  query postgres "create database $LIVE_DB template $SEED_DB" >/dev/null
  echo "rebuilt $LIVE_DB"
}

clone() {
  local target="$1"
  disconnect "$target"
  query postgres "drop database if exists $target" >/dev/null
  disconnect "$SEED_DB"
  query postgres "create database $target template $SEED_DB" >/dev/null
  echo "created $target from $SEED_DB"
}

drop() {
  local target="$1"
  disconnect "$target"
  query postgres "drop database if exists $target" >/dev/null
  echo "dropped $target"
}

case "${1:-}" in
  check) check ;;
  restore) restore ;;
  clone) clone "${2:?database name required}" ;;
  drop) drop "${2:?database name required}" ;;
  *)
    echo "usage: $0 {check|restore|clone <db>|drop <db>}" >&2
    exit 2
    ;;
esac
