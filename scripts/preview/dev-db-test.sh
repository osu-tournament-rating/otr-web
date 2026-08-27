#!/usr/bin/env bash
set -euo pipefail

# Integration harness for dev-db.sh. It never reaches the deployment host:
# the replica restore and the migrator are stubs, and the row floors are
# lowered so a six-row fixture stands in for the replica.
#
#   scripts/preview/dev-db-test.sh

preview="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
container="otr-dev-db-test-$$"
network="otr-dev-test-$$"
work="$(mktemp -d)"
failures=0

if docker inspect "$container" >/dev/null 2>&1; then
  echo "refusing to run: $container already exists" >&2
  exit 1
fi

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

pass() { echo "ok    $1"; }

bad() {
  echo "FAIL  $1" >&2
  failures=$((failures + 1))
}

contains() { # contains <label> <haystack> <needle>
  case "$2" in
    *"$3"*) pass "$1" ;;
    *) bad "$1: expected '$3' in: $2" ;;
  esac
}

missing() { # missing <label> <haystack> <needle>
  case "$2" in
    *"$3"*) bad "$1: did not expect '$3' in: $2" ;;
    *) pass "$1" ;;
  esac
}

equals() { # equals <label> <actual> <expected>
  if [[ "$2" == "$3" ]]; then pass "$1"; else bad "$1: got '$2', wanted '$3'"; fi
}

psql_scratch() { # psql_scratch <database> <sql>
  docker exec -i "$container" psql -U postgres -d "$1" -tAc "$2"
}

fk_count() { # fk_count <database>
  psql_scratch "$1" "select count(*) from pg_constraint where conname='matches_tournament_id_fkey'"
}

docker network create "$network" >/dev/null
docker run -d --name "$container" --network "$network" \
  -e POSTGRES_PASSWORD=harness-password postgres:17 >/dev/null
for _ in $(seq 1 60); do
  docker exec "$container" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

mkdir -p "$work/scripts" "$work/stubs"
cp -r "$preview" "$work/scripts/preview"
cd "$work"
cat > .env <<'ENVFILE'
DOCKER_POSTGRES_PASSWORD=harness-password
ENVFILE

# Stands in for the otr-scripts replica recovery. STUB_RESTORE_PARTIAL leaves
# the foreign key off and exits 0; STUB_RESTORE_FAIL leaves it off and exits 1.
cat > stubs/restore-stub.sh <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
sleep "${STUB_RESTORE_SLEEP:-0}"
docker exec -i "$DEV_DB_CONTAINER" psql -U postgres -d postgres -tAc \
  "drop database if exists $DEV_SEED_DB" >/dev/null
docker exec -i "$DEV_DB_CONTAINER" psql -U postgres -d postgres -tAc \
  "create database $DEV_SEED_DB" >/dev/null
docker exec -i "$DEV_DB_CONTAINER" psql -U postgres -d "$DEV_SEED_DB" -q <<'SQL'
create table tournaments (id serial primary key);
create table players (id serial primary key);
create table matches (
  id serial primary key,
  tournament_id integer not null references tournaments (id),
  created timestamptz not null default now()
);
create table games (id serial primary key);
create table game_scores (id serial primary key);
create table rating_adjustments (id serial primary key);
insert into tournaments default values;
insert into players default values;
insert into matches (tournament_id) values (1);
insert into games default values;
insert into game_scores default values;
insert into rating_adjustments default values;
create schema drizzle;
create table drizzle.__drizzle_migrations (
  id serial primary key,
  hash text not null,
  created_at bigint
);
insert into drizzle.__drizzle_migrations (created_at, hash) values (1000, 'aaa');
SQL
if [[ "${STUB_RESTORE_PARTIAL:-}" == true || "${STUB_RESTORE_FAIL:-}" == true ]]; then
  docker exec -i "$DEV_DB_CONTAINER" psql -U postgres -d "$DEV_SEED_DB" -tAc \
    "alter table matches drop constraint matches_tournament_id_fkey" >/dev/null
fi
if [[ "${STUB_RESTORE_FAIL:-}" == true ]]; then
  echo 'ERROR:  invalid input syntax for type integer: "x"' >&2
  echo 'CONTEXT:  COPY matches, line 3: "secret-row"' >&2
  exit 1
fi
STUB

# Stands in for drizzle's migrator, including the rule that decides what to
# apply: entries newer than max(created_at), never a hash comparison.
cat > stubs/migrate-stub.sh <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
database="$1"
echo "connecting to postgresql://postgres:$DOCKER_POSTGRES_PASSWORD@db:5432/$database"
echo "DETAIL:  Key (osu_id)=(12345) already exists."
run() { docker exec "$DEV_DB_CONTAINER" psql -U postgres -d "$database" -tAc "$1"; }
run "create schema if not exists drizzle" >/dev/null
run "create table if not exists drizzle.__drizzle_migrations
  (id serial primary key, hash text not null, created_at bigint)" >/dev/null
last="$(run "select coalesce(max(created_at), 0) from drizzle.__drizzle_migrations")"
while read -r when hash; do
  [[ -n "$when" ]] || continue
  if ((when > last)); then
    run "insert into drizzle.__drizzle_migrations (created_at, hash)
      values ($when, '$hash')" >/dev/null
    echo "applied $when"
  fi
done <<<"$EXPECTED_JOURNAL"
STUB
chmod +x stubs/restore-stub.sh stubs/migrate-stub.sh

export DEV_DB_CONTAINER="$container"
export DEV_NETWORK="$network"
export DEV_SEED_DB=otr_test_seed
export DEV_LIVE_DB=otr_test_live
export OTR_SCRIPTS_DIR="$work/stubs"
export DEV_RESTORE_COMMAND=./restore-stub.sh
export DEV_MIGRATOR_COMMAND="$work/stubs/migrate-stub.sh"
export DEV_DB_ROW_FLOORS="players:1 tournaments:1 matches:1 games:1 game_scores:1 rating_adjustments:1"
export PREVIEW_REMOTE_PATH="$work/previews"
export EXPECTED_JOURNAL=$'1000 aaa\n2000 bbb'
export DEV_DB_LOCK_WAIT=30

dev_db() { ./scripts/preview/dev-db.sh "$@"; }

# capabilities
out="$(dev_db capabilities)"
contains "capabilities reports the api version" "$out" "version=2"
contains "capabilities lists reap" "$out" "reap"

# check on a tier that has never been restored
status=0
out="$(dev_db check 2>&1)" || status=$?
equals "check fails before the live database exists" "$status" 1
contains "check names the missing database" "$out" "otr_test_live does not exist"

# sync restores when the live database is missing
out="$(dev_db sync 2>&1)"
contains "sync restores a missing live database" "$out" "sync: restoring"
contains "sync verifies the seed before templating" "$out" "verified otr_test_seed"
missing "restore output hides the password" "$out" "harness-password"
missing "restore output drops DETAIL lines" "$out" "osu_id"
equals "sync leaves the live database at the journal" \
  "$(psql_scratch otr_test_live 'select count(*) from drizzle.__drizzle_migrations')" 2
contains "check passes after sync" "$(dev_db check)" "dev-db check passed"

# the workflows deliver the host script on stdin; nothing here may read it
out="$(printf '%s\n' './scripts/preview/dev-db.sh restore' \
  './scripts/preview/dev-db.sh info otr_test_live' 'echo AFTER' | bash -s 2>&1)"
contains "a piped restore runs" "$out" "rebuilt otr_test_live"
contains "a piped info runs" "$out" "database=otr_test_live"
contains "the piped script runs to its end" "$out" "AFTER"

# a migration merged to the default branch
export EXPECTED_JOURNAL=$'1000 aaa\n2000 bbb\n3000 ccc'
out="$(dev_db sync 2>&1)"
contains "sync migrates a behind live database forward" "$out" "migrating otr_test_live forward"
missing "sync does not restore to catch up" "$out" "sync: restoring"
contains "classify reports the live database" "$(dev_db classify otr_test_live)" "status=match"

# clone
out="$(dev_db clone otr_pr_1 2>&1)"
contains "a first clone is created" "$out" "action=create"
generation="$(sed -n 's/^generation=//p' <<<"$out")"
cloned="$(sed -n 's/^cloned=//p' <<<"$out")"
contains "the clone is stamped with the seed generation" "$out" "generation=$generation"
equals "clone provenance records the seed generation" \
  "$([[ "$generation" =~ ^[0-9]+$ ]] && echo yes || echo no)" yes

out="$(dev_db clone otr_pr_1 2>&1)"
contains "a clone behind the head journal is kept" "$out" "action=reuse-migrate"
equals "reuse does not re-template the clone" "$(sed -n 's/^cloned=//p' <<<"$out")" "$cloned"

DOCKER_POSTGRES_PASSWORD=harness-password "$work/stubs/migrate-stub.sh" otr_pr_1 >/dev/null 2>&1
contains "verify passes once the clone is migrated" "$(dev_db verify otr_pr_1)" "verified otr_pr_1"
contains "a clone at the head journal is reused" "$(dev_db clone otr_pr_1 2>&1)" "action=reuse"

status=0
out="$(DEV_DB_MAX_CLONES=1 dev_db clone otr_pr_2 2>&1)" || status=$?
equals "the clone cap refuses with exit 3" "$status" 3
contains "the cap refusal says what to do" "$out" "run the Dev tier reap action"

status=0
out="$(DEV_DB_MIN_FREE_BYTES=999999999999999 dev_db clone otr_pr_2 2>&1)" || status=$?
equals "a full volume refuses with exit 3" "$status" 3
contains "the disk refusal reports free space" "$out" "free"

# a stale seed generation forces a re-clone
psql_scratch postgres "comment on database otr_test_seed is '{\"generation\":1,\"created\":1}'" >/dev/null
contains "a clone from an older seed generation is recreated" \
  "$(dev_db clone otr_pr_1 2>&1)" "action=recreate"
contains "a second clone is created" "$(dev_db clone otr_pr_2 2>&1)" "action=create"

psql_scratch otr_pr_2 "drop schema drizzle cascade" >/dev/null 2>&1
out="$(dev_db classify otr_pr_2)"
contains "a database with no journal table is behind" "$out" "status=behind"
contains "and has nothing applied" "$out" "applied=0"

# info
out="$(dev_db info otr_pr_1)"
contains "info reports the database name" "$out" "database=otr_pr_1"
contains "info reports a readable size" "$out" "size_pretty="
contains "info reports the data age" "$out" "data_age_seconds="

# reap
mkdir -p "$work/previews/pr-1" "$work/previews/pr-2"
status=0
out="$(dev_db reap 2>&1)" || status=$?
equals "reap refuses without OPEN_PRS" "$status" 1
contains "reap says why it refused" "$out" "OPEN_PRS is not set"

export OPEN_PRS=$'1\n2'
out="$(dev_db reap --dry-run)"
contains "open pull requests keep their databases" "$out" "reap: 0 databases"

export OPEN_PRS=1
out="$(dev_db reap --dry-run)"
contains "a dry run reports the database it would remove" "$out" "would remove otr_pr_2"
missing "an open pull request keeps its database" "$out" "otr_pr_1"
contains "a dry run reports the bytes it would free" "$out" "reap: 1 databases"
equals "a dry run removes nothing" \
  "$(psql_scratch postgres "select count(*) from pg_database where datname='otr_pr_2'")" 1

export OPEN_PRS=
status=0
out="$(DEV_DB_REAP_LIMIT=1 dev_db reap 2>&1)" || status=$?
equals "reap refuses to exceed its limit" "$status" 1
contains "reap names the limit" "$out" "DEV_DB_REAP_LIMIT"

out="$(dev_db reap 2>&1)"
contains "reap removes the first orphan" "$out" "removed otr_pr_1"
contains "reap removes the second orphan" "$out" "removed otr_pr_2"
contains "reap counts every orphan" "$out" "reap: 2 databases"
equals "the orphan databases are gone" \
  "$(psql_scratch postgres "select count(*) from pg_database where datname in ('otr_pr_1','otr_pr_2')")" 0
equals "the orphan directories are gone" \
  "$([[ -d "$work/previews/pr-1" || -d "$work/previews/pr-2" ]] && echo yes || echo no)" no
equals "reap leaves the seed and live databases alone" \
  "$(psql_scratch postgres "select count(*) from pg_database
    where datname in ('otr_test_seed','otr_test_live')")" 2

# the namespace guard
status=0
out="$(dev_db drop otr_test_live 2>&1)" || status=$?
equals "drop refuses a database outside the per-PR namespace" "$status" 1
contains "drop says why" "$out" "not a per-PR database name"

# a restore that dies partway never reaches the live database
live="$(psql_scratch postgres "select oid from pg_database where datname='otr_test_live'")"
status=0
out="$(STUB_RESTORE_PARTIAL=true dev_db restore 2>&1)" || status=$?
equals "a partial restore fails" "$status" 1
contains "the failure names the problem" "$out" "restore was incomplete"
missing "a partial restore does not rebuild the live database" "$out" "rebuilding otr_test_live"
equals "the live database is untouched" \
  "$(psql_scratch postgres "select oid from pg_database where datname='otr_test_live'")" "$live"

# a restore that exits partway leaves a seed that must never be templated
status=0
out="$(STUB_RESTORE_FAIL=true dev_db restore 2>&1)" || status=$?
equals "a failed restore exits 1" "$status" 1
contains "the failure reports the exit status" "$out" "restore of otr_test_seed failed (exit 1)"
missing "restore output drops CONTEXT lines" "$out" "secret-row"
missing "a failed restore does not rebuild the live database" "$out" "rebuilding otr_test_live"
equals "the seed is left without its foreign key" "$(fk_count otr_test_seed)" 0

out="$(dev_db sync 2>&1)"
contains "sync restores a broken seed" "$out" "sync: restoring, matches has no foreign keys"
equals "sync repairs the seed" "$(fk_count otr_test_seed)" 1

STUB_RESTORE_FAIL=true dev_db restore >/dev/null 2>&1 || true
out="$(dev_db clone otr_pr_3 2>&1)"
contains "clone restores a broken seed first" "$out" "clone: restoring first"
contains "clone then creates the database" "$out" "action=create"
equals "the clone has the foreign key" "$(fk_count otr_pr_3)" 1

# a second mutating operation waits, then gives up
STUB_RESTORE_SLEEP=10 dev_db restore >/dev/null 2>&1 &
holder=$!
for _ in $(seq 1 100); do
  flock -n -E 4 "$work/.dev-db.lock" true || break
  sleep 0.1
done
status=0
out="$(DEV_DB_LOCK_WAIT=1 dev_db drop otr_pr_9 2>&1)" || status=$?
equals "a concurrent mutation exits 4" "$status" 4
contains "the lock message says a lock is held" "$out" \
  "another dev tier operation still holds the lock"
wait "$holder" || true

if ((failures > 0)); then
  echo "$failures checks failed" >&2
  exit 1
fi
echo "all checks passed"
