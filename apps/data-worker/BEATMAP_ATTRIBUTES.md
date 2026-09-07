# Beatmap attributes

The opt-in attributes worker acquires `.osu` files and calculates versioned
attributes with pinned `rosu-pp-js@4.0.1` on the dedicated
`processing.attributes.beatmaps` queue. It runs separately from API ingestion.
No frontend or public endpoint consumes these results yet.

Difficulty attributes come from the file and calculator, not the osu! API
attributes endpoint or API difficulty metadata. Total and drain lengths remain
on the existing beatmap metadata record; `getBeatmapMetadataLengths` divides
those values by the standard mod rate when needed. They are not recalculated
from hit objects or duplicated in attribute results. Human verification and
rating processing remain independent. Score-specific PP is outside this MVP.

## Run locally

Use Linux, Bun with repository dependencies installed, a task-owned RabbitMQ
broker, and a disposable PostgreSQL database created through `otr-scripts`
`template-db` on port `5434`, using this checkout for migrations. Set
`DATABASE_URL` to its supplied connection string and `RABBITMQ_AMQP_URL` to your
broker. Local integration tests reject port `5432`; GitHub Actions uses its
isolated service on that port.

Set these in each shell running a command:

```sh
export BEATMAP_ATTRIBUTES_ENABLED=true
export BEATMAP_ATTRIBUTES_STORAGE=local
export BEATMAP_ATTRIBUTES_LOCAL_DIR=/tmp/beatmap-files
export BEATMAP_ATTRIBUTES_CONCURRENCY=2
```

Start the consumer, then enqueue and inspect a map from another shell:

```sh
bun run --cwd apps/data-worker attributes:worker
```

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --ruleset 0
bun run --cwd apps/data-worker attributes --osu-id 2785319 --inspect
```

The CLI returns after recording work. Inspection loads `beatmapFiles`,
`beatmapAttributes`, and `beatmapAttributeJobs` through Drizzle relationships,
along with resolved current results. Repeat scheduling to verify that the
result IDs stay unchanged. Standalone commands need no osu! OAuth or GCP
credentials with local storage. A missing map becomes a metadata placeholder;
this does not mark API metadata fetched. Inspection never creates a map.

## Configuration

| Variable                         | Behavior                                                                    |
| -------------------------------- | --------------------------------------------------------------------------- |
| `BEATMAP_ATTRIBUTES_ENABLED`     | Defaults to `false`; enables ingestion scheduling and standalone commands.  |
| `BEATMAP_ATTRIBUTES_STORAGE`     | Explicitly select `local` or `gcp`.                                         |
| `BEATMAP_ATTRIBUTES_LOCAL_DIR`   | Required absolute directory for local storage.                              |
| `BEATMAP_ATTRIBUTES_GCP_BUCKET`  | Required existing bucket for GCP; uses the client's configured credentials. |
| `BEATMAP_ATTRIBUTES_CONCURRENCY` | Active jobs and calculator processes per worker: `1`–`4`, default `2`.      |
| `METRICS_PORT`                   | Dedicated worker health and metrics listener, default `9092`.               |

Processing enablement does not automatically backfill history or upgrade
calculator targets. Successful metadata ingestion records job intent in the
same database transaction. The dedicated worker's recovery loop publishes that
intent, including after a restart or failed publication.

## Profiles and identity

| Native ruleset  | CLI ruleset | Default profiles       |
| --------------- | ----------- | ---------------------- |
| osu!            | `0`         | NM, HR, HD, EZ, FL, DT |
| osu!taiko       | `1`         | NM, HR, EZ, DT         |
| osu!catch       | `2`         | NM, HR, EZ, DT         |
| osu!mania other | `3`         | NM, DT                 |
| osu!mania 4K    | `4`         | NM, DT                 |
| osu!mania 7K    | `5`         | NM, DT                 |

HD/FL duplicate NM outside osu! for the pinned calculator. Mania HR/EZ can
change OD/HP despite unchanged stars, but are omitted from defaults. All six
individual profiles remain available explicitly via `--mods`: NM `0`, HR `16`,
HD `8`, EZ `2`, FL `1024`, DT `64`. Combinations and custom rates/lazer requests
are deferred. Each job targets one ruleset with at most six canonical profiles.
Native mania uses library mode `3`; 4K/7K targets validate the parsed key count.
Automatic conversion between native modes is unsupported.

NC `512` and NC-with-DT `576` normalize to DT before scheduling, lookup,
calculation, and storage. This requests one equivalent calculation:

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --mods 64,512,576
```

DT/NC uses rate `1.5` once; other profiles use `1`. Identity includes checksum,
calculator version, calculation-format version, target ruleset, explicit library
mode, canonical mods, standard rate, and explicit stable behavior. Effective
AR/OD preserve fractions and may exceed editor bounds. Inapplicable values are
`null`. Common attributes use columns; a validated versioned JSON payload holds
selected ruleset-specific difficulty components and object counts.

## Files and failures

Before HTTP starts, a related file row has fetch status `Fetching` and records
its provider, upstream ID/URL, and attempt time. Success checkpoints `Fetched`
with storage key, SHA-256 checksum, byte length, and acquisition time before
calculation. Failed downloads retain `NotFound` or `Error` with a safe error code.
File fetch status is independent of metadata fetch, calculation, and verification.
A calculation retry reuses a completed download.

Files use `sha256/<prefix>/<checksum>.osu` keys and are shared across profiles.
The local provider writes atomically and verifies checksums. Its directory lasts
only as long as the host/operator retains it: `/tmp` may be cleaned on reboot.
Use a persistent mounted directory when retention is needed. There is no garbage
collection in this MVP.

A retry reacquires missing/corrupt files. Switching provider reuses only the
current checksum under the selected provider; it does not substitute an older
source. GCP failures never fall back to local storage. The GCP adapter and
configuration path are implemented, but no live GCP operation was tested and no
cloud resources were provisioned. Configure and validate an existing bucket
before enabling GCP in an environment.

The job's acquisition pointer tracks its current file attempt; its completed
source pointer changes only after results commit. Generation and lease checks
prevent late attempts from publishing obsolete results or replacing that pointer.
Prior results survive failed refreshes. Relationships include history;
`getBeatmapAttribute` resolves the intended source and supported format. Older
formats remain available through history relationships; explicit recalculation
is required before current lookup returns a result for those jobs.

## Recalculation and recovery

Reschedule a completed/failed map to reset its retry budget or repair a missing
file. Matching source/settings/version results are reused:

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --recalculate
bun run --cwd apps/data-worker attributes --osu-id 2785319 --refresh-source
```

Recalculation selects the running calculator/format and replaces profiles with
those requested (defaults when `--mods` is absent). Refresh explicitly checks
upstream bytes. Ordinary ingestion preserves an existing calculator target and
profile selection. Stop obsolete workers before an operator-initiated version
rollout; update the pinned dependency and calculator identifier, and increment
format version when stored interpretation or payload changes.

Catch up existing fetched beatmaps or rebuild after an update in bounded batches:

```sh
bun run --cwd apps/data-worker attributes --batch-size 25 --recalculate
bun run --cwd apps/data-worker attributes --batch-size 25 --after-id 100 --recalculate
```

Use the returned `nextAfterId` as the next database-ID cursor, until `scheduled`
is zero. A batch accepts at most 100 maps and uses ruleset defaults. Omit
`--recalculate` for initial catch-up that preserves existing targets. These are
explicit operator commands; there is no automatic version or history scan.

Jobs run in parallel within the configured bound; profiles share one parsed map
inside an isolated child process. Each calculator attempt has a 60-second limit
and 512 MiB RSS limit on Linux. Downloads are limited to 8 MiB, 20 seconds per
HTTP request, two concurrent requests, and 60 attempts per minute per worker.
An acquisition has a 180-second active budget. HTTP 429 uses exponential backoff
starting at eight seconds and honors `Retry-After`; longer cooldowns are persisted
for later attempts. These limits are per worker instance, so account for the
number of instances before increasing deployment concurrency.

The database pool is bounded to job concurrency plus two connections. The recovery
loop runs every 15 seconds, republishes unclaimed intent after 60 seconds, and
reclaims expired 120-second leases. Active attempts renew every 15 seconds.
Retryable failures have four job attempts with bounded backoff; terminal invalid
maps and unavailable sources remain inspectable. Calculator failures do not
change final verification decisions or block unrelated API ingestion.

Run the existing data-worker image with the `attributes:worker` command as a
separate service when deploying. Select storage, mount retained local files if
used, configure queue/database access and health monitoring, and enable ingestion
and the consumer together. Local validation does not provision that service or
establish GCP readiness.
