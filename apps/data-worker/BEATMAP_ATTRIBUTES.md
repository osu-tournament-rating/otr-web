# Beatmap attributes

The opt-in attributes worker downloads a beatmap's `.osu` file, stores its
provenance, and calculates versioned attributes on the dedicated
`processing.attributes.beatmaps` RabbitMQ queue. It runs separately from the osu!
API ingestion worker. No public endpoint or frontend consumes these results yet.

Attributes come from the source file and pinned `rosu-pp-js@4.0.1`, with a small
worker-private duration binding at version `1.0.1`. The combined calculator
identifier is `rosu-pp-js@4.0.1+duration@1.0.1`. The osu! API attributes endpoint
and API difficulty metadata are not calculation inputs. Existing metadata ingestion,
human verification, and tournament rating calculation remain independent.
Score-specific performance points are outside this workflow.

## Local workflow

Use Linux, Bun, installed repository dependencies, a task-owned RabbitMQ broker,
and a disposable PostgreSQL database prepared by `otr-scripts template-db` on
port `5434`. Apply the task checkout's migrations through that preparation
workflow. Set `DATABASE_URL` to the connection string it supplies and
`RABBITMQ_AMQP_URL` to the task-owned broker. Never use the development database
on port `5432`.

From the repository root, set the following environment variables in each shell
that runs a command:

```sh
export BEATMAP_ATTRIBUTES_ENABLED=true
export BEATMAP_ATTRIBUTES_STORAGE=local
export BEATMAP_ATTRIBUTES_LOCAL_DIR=/tmp/beatmap-files
export BEATMAP_ATTRIBUTES_CONCURRENCY=2
export BEATMAP_ATTRIBUTES_DISCOVER=false
```

Start the dedicated consumer in one shell:

```sh
bun run --cwd apps/data-worker attributes:worker
```

Enqueue a real native osu! map in another shell:

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --ruleset 0
```

The CLI prints the durable job ID, generation, and canonical profiles. It returns
after scheduling; the consumer downloads and calculates asynchronously. Inspect
the stored relationships and resolved profile results after processing:

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --ruleset 0 --inspect
```

Inspection includes `beatmapFiles`, `beatmapAttributes`, and
`beatmapAttributeJobs`. A successful job has status `complete`, a source file,
and six resolved profiles for this osu! example. Other rulesets use the default
profiles listed below. Each stored result includes a source checksum and
calculator version. Repeat the enqueue command to check idempotency: unchanged
requests reuse the job and stored results.

The standalone commands need neither osu! OAuth credentials nor GCP credentials
when local storage is selected. Scheduling validates the requested settings before
creating a missing beatmap as a metadata placeholder; invalid settings do not
create records. Inspection does not create a missing beatmap. Calculating
attributes does not claim that API metadata was fetched.

## Configuration

| Variable                         | Behavior                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `BEATMAP_ATTRIBUTES_ENABLED`     | Defaults to `false`. Set to `true` for ingestion scheduling and standalone attributes commands.                 |
| `BEATMAP_ATTRIBUTES_STORAGE`     | Explicitly choose `local` or `gcp` when processing is enabled.                                                  |
| `BEATMAP_ATTRIBUTES_LOCAL_DIR`   | Required absolute storage directory for `local`. Use a task-owned directory for local verification.             |
| `BEATMAP_ATTRIBUTES_GCP_BUCKET`  | Required existing bucket name for `gcp`. Authentication uses the Cloud Storage client's configured credentials. |
| `BEATMAP_ATTRIBUTES_CONCURRENCY` | Integer from `1` through `4`; defaults to `2`. Bounds active beatmap jobs and calculator processes per worker.  |
| `BEATMAP_ATTRIBUTES_DISCOVER`    | Defaults to enabled. Set to `false` for a local run limited to explicitly scheduled jobs.                       |
| `DATABASE_URL`                   | PostgreSQL connection string. Local verification uses the disposable database on port `5434`.                   |
| `RABBITMQ_AMQP_URL`              | Broker connection used by the dedicated consumer and confirmed publisher.                                       |

With discovery enabled, reconciliation finds fetched beatmaps that have no
attributes job and schedules batches of up to 25. It also schedules jobs whose
desired versions can be upgraded to the running worker's versions. Jobs requesting
newer or unrecognized versions are left unchanged. Enabling discovery can start
a historical backfill. The normal ingestion worker schedules affected beatmaps
after its metadata transaction commits. When fetched, non-manual metadata changes,
scheduling records a source refresh even for an already-complete job. Discovery
also checks those metadata revisions, recovering a missed callback after
interruption or a scheduling failure.

## Rulesets, profiles, and identity

The MVP accepts six individual profiles: NM (`0`), HR (`16`), HD (`8`), EZ (`2`),
FL (`1024`), and DT (`64`). Automatic scheduling and the CLI with `--mods` omitted
use defaults selected by ruleset:

| Ruleset                     | Default profiles       | Count |
| --------------------------- | ---------------------- | ----- |
| osu!                        | NM, HR, HD, EZ, FL, DT | 6     |
| osu!taiko                   | NM, HR, EZ, DT         | 4     |
| osu!catch                   | NM, HR, EZ, DT         | 4     |
| osu!mania other, 4K, and 7K | NM, DT                 | 2     |

The pinned calculator returns the same full attributes for HD/FL as NM outside
osu!, so those profiles are omitted from automatic defaults. Mania HR/EZ can
still change effective OD and HP even when the star rating is unchanged. They
remain distinct, valid explicit requests and are not aliases of NM. All six
profiles remain available through `--mods` for every supported native ruleset.
This changes default work selection without changing calculator math or identity.
Unsupported combinations are rejected. Requests remain settings objects so later
combinations can be added without changing the job envelope.

| o!TR ruleset    | CLI value | Required native file                            |
| --------------- | --------- | ----------------------------------------------- |
| osu!            | `0`       | osu!                                            |
| osu!taiko       | `1`       | osu!taiko                                       |
| osu!catch       | `2`       | osu!catch                                       |
| osu!mania other | `3`       | Native mania; the parsed key count is retained. |
| osu!mania 4K    | `4`       | Native mania with four keys.                    |
| osu!mania 7K    | `5`       | Native mania with seven keys.                   |

All mania variants map explicitly to library mode `3`; o!TR ruleset values `4`
and `5` are never passed as library modes. Standard maps are not automatically
converted to another ruleset. Use `--ruleset` when creating a CLI placeholder or
requesting a specific compatible target ruleset. API ingestion uses generic
mania ruleset `3`, retaining the parsed key count. Explicit targets `4` and `5`
validate that count and retain distinct calculation identities.

NC (`512`) and NC with DT (`576`) canonicalize to DT before scheduling, cache
lookup, calculation, and persistence. This schedules one profile:

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --mods 64,512,576
```

Stable behavior is the default. `--lazer` explicitly selects lazer behavior.
`--clock-rate` supplies an effective speed from `0.01` through `100`; its value
is preserved during NC normalization. Without an override, DT/NC uses `1.5` and
the other profiles use `1`. Speed is applied once:

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --mods 512 --clock-rate 1.25 --lazer
```

Calculation identity includes the source checksum, calculator version,
calculation-format version, target o!TR ruleset, explicit library mode, canonical
mods, effective clock rate, and stable/lazer setting. Different speeds and
stable/lazer behavior retain separate results. A job accepts between 1 and 64
unique canonical requests. Ordinary CLI scheduling merges the selected profiles
with existing requests. Automatic metadata refresh preserves the recorded set,
including explicit mods, custom clock rates, and lazer settings. `--recalculate`
replaces the requested set with the CLI selection; omitting `--mods` selects the
ruleset defaults. Changing that set does not delete stored results.

## Storage, provenance, and rebuilding

Files use content-addressed keys of the form
`sha256/<prefix>/<checksum>.osu`. The database stores the provider, relative key,
SHA-256 checksum, byte length, upstream beatmap ID and URL, acquisition time,
parsed mode, and applicable key count. It does not store the local directory or
cloud credentials. All profiles reuse the same source bytes.

The local provider writes atomically and validates stored bytes against their
checksum. Its directory persists only as long as the operator or host retains
it. A directory under `/tmp` can disappear during host cleanup or reboot. Keep a
persistent mounted directory when retained files are required. No automatic file
garbage collection is provided.

A processing attempt reacquires a missing or corrupted local file from
`https://osu.ppy.sh/osu/<id>`. To repair storage for an already-complete job,
reschedule it:

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --recalculate
```

`--recalculate` starts a new job generation, replaces its requested profile set,
and resets its retry budget. Matching source/settings/version results are reused,
so unchanged work stays idempotent. Supply `--mods` and any custom settings again
to retain them in this explicit replacement; otherwise the CLI uses the defaults.
To check upstream bytes even when the stored file is available, use:

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --refresh-source
```

A changed source checksum creates distinct provenance and result identities.
An unchanged download reuses existing records. If upstream no longer serves a
missing source file, acquisition fails without inventing source data; prior
stored result history remains available.

Results retain common attributes in explicit columns and additional
ruleset-specific results in validated, versioned JSON. Inapplicable values are
`null`. Effective AR/OD and durations preserve fractional values. `created`
records calculation time. `total_length` measures first object start through
latest object end; `drain_length` subtracts the union of clipped break intervals.
Slider repeats, inherited velocity, spinner ends, hold ends, and effective speed
are included. Intro/outro audio is outside this interval. See the
[duration binding](beatmap-duration/README.md) for definitions and regeneration.

Result history is append-only for each source and calculation identity. The
`getBeatmapAttribute` service resolves canonical requests using the job's current
source and desired versions. Direct beatmap relationships also expose retained
history, so future callers must select the intended source/version explicitly.

A fresh run using one osu!, one taiko, one catch, one mania 4K, and one mania 7K
map produces 18 default-profile results: 6 + 4 + 4 + 2 + 2. An existing database
can also contain retained results from earlier calculator versions or broader
profile selections. The full `beatmapAttributes` relationship includes those
rows. Validate the `resolved` profiles against the defaults table and their
calculator version separately from the historical row count. Repeating the same
calculation adds no duplicate results. Applying the reduced defaults to an old
job requires explicit `--recalculate`; ordinary scheduling preserves its requests.

When updating rosu or duration semantics, update the pinned calculator dependency
and calculator-version identifier; change the calculation-format version when
the stored interpretation or JSON format changes. Version upgrades must move
forward independently across the library release, duration release, and format
version: none may decrease, and at least one must increase. Increasing the library
version does not permit downgrading the duration or format version.

An older worker cannot downgrade a job's desired versions during ordinary
scheduling or explicit `--recalculate`. Those requests are rejected when the
stored versions are newer or cannot be recognized; discovery skips those jobs.
Use a worker that recognizes and meets all desired versions. Automatic discovery
rebuilds eligible older jobs using their recorded requests. With discovery
disabled, enqueue or recalculate selected beatmaps explicitly. A duration upgrade
from `1.0.0` to `1.0.1` creates new calculation identities while retaining the old
results and their provenance.

## Processing limits and recovery

Independent beatmap jobs run in parallel. Within one job, the missing profiles
run sequentially in a separate Bun process. The Linux worker samples each child
process's resident memory every 100 milliseconds and kills it above 512 MiB.
This is a sampled process limit, not a kernel memory reservation. Each child
also has a 60-second deadline and a 1 MiB output limit. At the default concurrency,
up to two calculator processes run at once, in addition to the parent worker.

Downloads are capped at two concurrent requests per worker, or one when worker
concurrency is one. Files and storage reads are bounded to 8 MiB and a 20-second
deadline. Validation rejects HTML, redirects, invalid UTF-8, mismatched beatmap
IDs, invalid parsed content, suspicious maps, more than 100,000 hit objects, and
nonfinite calculator output. The database pool is limited to worker concurrency
plus two connections, with a 10-second connection timeout and 30-second statement
timeout. Limits apply per worker instance; additional instances multiply capacity.

Jobs store `pending`, `processing`, `complete`, or `failed` independently of
metadata fetching and verification. The durable job generation and lease token
own each attempt. Result insertion and completion occur together only while that
ownership is still current; a late attempt cannot commit over a newer generation.

The nullable job field `sourceMetadataUpdatedAt` records the metadata revision
for which a source refresh has been durably queued. Scheduling compares it with
the fetched beatmap's `updated` value, falling back to `created` when needed.
Any distinct revision triggers refresh; timestamps need not increase because
overlapping fetches can commit out of order. The marker and pending refresh flag
are saved with the new generation. Unrelated profile additions or version upgrades
preserve that pending refresh. Manually overridden metadata is excluded from
these automatic source-revision checks.

Source reconciliation scans bounded batches of 25 with pagination. A callback
lost after metadata commits is recoverable because the stored revision differs
from the marker. Existing fetched jobs with a null marker receive one initial
refresh. An unchanged re-download reuses source/results without creating a
permanent refresh loop. A failed refresh retains its marker and uses the bounded
retry budget; discovery does not continually reset it for the same revision.

Reconciliation runs on startup and every 15 seconds. Publication has a 60-second
lease, allowing recovery when a database commit succeeds but publication fails,
or the broker confirms delivery ambiguously. A processing lease lasts 120 seconds
and renews every 15 seconds. Expired attempts can be reclaimed after process
interruption. Duplicate and obsolete messages are acknowledged without repeating
completed calculations.

Transient failures allow four total attempts, with retry delays of 15, 30, and
60 seconds, plus reconciliation cadence. Terminal failures, such as a missing
upstream file or invalid calculation, stop immediately. Jobs retain a concise
error code. After repairing the cause, use `--recalculate` to reset the attempt
budget. Calculation failures do not change final verification decisions or block
unrelated metadata ingestion.

## GCP and rollout

The GCP provider is isolated behind the same storage interface. It uses an
explicit existing bucket, checksum validation, bounded streams, and conditional
object creation. The code does not provision resources and never falls back to
local storage after a GCP failure. GCP coverage is limited to isolated tests with
an injected client; no live GCP bucket or credentials were tested for this MVP.

Apply migrations before deploying readers or workers, with processing flags
disabled. Migration `0031` retains the accepted empty legacy attributes-table
premise. Additive migration `0032` adds the nullable source metadata marker without
removing existing results; discovery performs the initial refresh described above.
Unrelated records and contracts are preserved. Deploy the standalone consumer
with explicit storage, then enable processing for the consumer and ingestion worker. Enable discovery
only when the historical backfill is wanted. Disabling processing prevents new
ingestion scheduling; stop the standalone consumer to stop consuming queued jobs.

Public replicas already include `beatmap_attributes`. Coordinate the companion
`otr-scripts` whitelist update to include public-safe `beatmap_files` provenance
before exporting populated results. Job leases, retries, and scheduling state
are operational records and are excluded from public replica data. No cloud
deployment or resource provisioning is part of local validation.
