# Beatmap attributes

This document is the reference for the beatmap attribute pipeline in
`apps/data-worker`. The pipeline downloads beatmap files from osu!, calculates
difficulty attributes for a fixed set of mod profiles with `rosu-pp-js@4.0.1`,
and stores each result with its source file and calculator version. Read this
document before you operate, test, review, or change the pipeline. It contains
the answers that you would otherwise find in the code.

The pipeline is opt-in. No web page and no public endpoint reads the results
yet.

## Overview

The pipeline has four stages:

1. Record intent. A row in `beatmap_attribute_jobs` says which profiles a
   beatmap needs. Metadata ingestion or an operator command writes this row.
2. Publish. A recovery loop in the attributes worker publishes the row to the
   `processing.attributes.beatmaps` queue.
3. Acquire the file. The worker reads the `.osu` file from storage. If the file
   is not in storage, the worker downloads it from `https://osu.ppy.sh/osu/<id>`
   and stores it.
4. Calculate. A child process parses the file one time and returns one result
   for each profile. The worker stores the results in `beatmap_attributes`.

Each stage writes its state to the database before the next stage starts. A
retry reuses the stored file and the stored results.

### Components

| Component              | Entry point                                                                                                                                                                              | Role                                                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ingestion worker       | `apps/data-worker/src/index.ts`                                                                                                                                                          | Consumes osu! API fetch messages. When `BEATMAP_ATTRIBUTES_ENABLED=true`, records attribute intent inside each beatmap metadata transaction. It does not download files and does not calculate. |
| Attributes worker      | `apps/data-worker/src/beatmap-attributes/worker.ts`                                                                                                                                      | Consumes the attribute queue, runs the recovery loop, and serves `/health` and `/metrics` on `METRICS_PORT`.                                                                                    |
| CLI                    | `apps/data-worker/src/beatmap-attributes/cli.ts`, `command.ts`                                                                                                                           | Operator commands: schedule, inspect, recalculate, refresh, and batch catch-up.                                                                                                                 |
| Service                | `apps/data-worker/src/beatmap-attributes/service.ts`                                                                                                                                     | Intent recording, the recovery loop, job processing, and result lookup.                                                                                                                         |
| Storage and downloader | `apps/data-worker/src/beatmap-attributes/storage.ts`, `gcp-storage.ts`                                                                                                                   | File validation, the `local` and `gcp` providers, the startup access check, and the rate-limited downloader.                                                                                    |
| Calculator             | `apps/data-worker/src/beatmap-attributes/calculator.ts`, `calculator-process.ts`, `calculator-child.ts`, `calculator-version.ts`                                                         | Source validation and `rosu-pp-js` calculation in an isolated child process.                                                                                                                    |
| Policy                 | `apps/data-worker/src/beatmap-attributes/policy.ts`                                                                                                                                      | Limits, timings, retry delays, configuration parsing, and credential parsing.                                                                                                                   |
| Shared contracts       | `packages/otr-core/src/osu/beatmap-attributes.ts`, `packages/otr-core/src/db/schema.ts`, `packages/otr-core/src/db/relations.ts`, `packages/otr-core/src/messages/beatmap-attributes.ts` | Profiles, settings normalization, result identity, result schemas, table definitions, Drizzle relations, and the queue message schema.                                                          |
| Fixtures               | `apps/data-worker/src/beatmap-attributes/calculator-fixtures/`                                                                                                                           | Five real `.osu` files that cover each native mode and the 4K and 7K mania identities.                                                                                                          |

### Boundaries

- Difficulty values come from the file and the calculator. They do not come
  from the osu! API.
- Total length and drain length stay on the `beatmaps` row.
  `getBeatmapMetadataLengths` divides them by the profile clock rate. The
  pipeline does not store lengths.
- The pipeline does not read or change verification status, ratings, or
  `beatmaps.data_fetch_status`.
- The pipeline does not calculate score PP.
- The calculator runs only on Linux. The memory monitor reads
  `/proc/<pid>/status`.

## Tables

### Purpose of each table

| Table                    | Purpose                                                       | Rows                                                                                          |
| ------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `beatmap_attribute_jobs` | The durable request for one beatmap and its processing state. | One for each beatmap. `beatmap_id` is unique.                                                 |
| `beatmap_files`          | Each download attempt and each stored file.                   | One for each attempt until it succeeds. Then one for each `(beatmap_id, provider, checksum)`. |
| `beatmap_attributes`     | One calculated result for one profile.                        | One for each `(beatmap_id, file_id, identity)`.                                               |

All three tables reference `beatmaps.id`. `beatmap_files.osu_beatmap_id` also
records the osu! ID that was downloaded.

### `beatmap_attribute_jobs`

| Column                       | Type        | Meaning                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                         | text        | A UUID. Queue messages carry this value.                                                                                                                                                                                                                                                                                            |
| `beatmap_id`                 | integer     | The `beatmaps.id`. Unique. A beatmap delete cascades to this row.                                                                                                                                                                                                                                                                   |
| `generation`                 | integer     | Starts at 1. Increases by 1 each time a reschedule changes the request. A queue message carries the generation it was published for. The worker rejects a message whose generation is different from the row.                                                                                                                       |
| `status`                     | text        | `pending`, `processing`, `complete`, or `failed`. See [Job status](#job-status).                                                                                                                                                                                                                                                    |
| `attempts`                   | integer     | The number of claims in the current generation. Reset to 0 when the generation changes. The limit is 4.                                                                                                                                                                                                                             |
| `requested_settings`         | jsonb       | An array of 1 to 6 normalized profiles. All entries have the same `ruleset`. See [Profiles and settings](#profiles-and-settings).                                                                                                                                                                                                   |
| `refresh_source`             | boolean     | `true` means that the next attempt must download the file again and must not reuse a stored file. Set to `false` when the job completes.                                                                                                                                                                                            |
| `acquired_file_id`           | integer     | The `beatmap_files` row of the current or last attempt. Set before the HTTP request starts, so a download in progress is visible. The pointer survives a reschedule unless `--refresh-source` is used or the previous attempt was abandoned. Also null after a reschedule that sets `refresh_source`, including metadata ingestion. |
| `source_file_id`             | integer     | The file that the committed results came from. Changes only when a generation completes. A failed refresh keeps the previous value.                                                                                                                                                                                                 |
| `lease_token`                | text        | A random token that identifies the worker that holds the claim. Null when the status is not `processing`.                                                                                                                                                                                                                           |
| `lease_expires_at`           | timestamptz | The time the claim expires. The worker renews it every 15 seconds while it processes. The recovery loop can republish the job after this time.                                                                                                                                                                                      |
| `next_attempt_at`            | timestamptz | The earliest time that a worker can claim the job. A retryable failure moves it into the future.                                                                                                                                                                                                                                    |
| `published_at`               | timestamptz | The last time the recovery loop published this generation. The loop publishes again if the job is still claimable 60 seconds later.                                                                                                                                                                                                 |
| `desired_calculator_version` | text        | The calculator that must process this job, for example `rosu-pp-js@4.0.1`. A worker claims only jobs that match its own `CALCULATOR_VERSION`.                                                                                                                                                                                       |
| `desired_format_version`     | integer     | The result format that this job must produce. A worker claims only jobs that match its own `CALCULATION_FORMAT_VERSION`.                                                                                                                                                                                                            |
| `requested_at`               | timestamptz | The time the current generation was requested. The recovery loop publishes jobs in this order.                                                                                                                                                                                                                                      |
| `error_code`                 | text        | The last error code. Null after a success. See [Error codes](#error-codes).                                                                                                                                                                                                                                                         |

### `beatmap_files`

| Column               | Type        | Meaning                                                                                                                                          |
| -------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                 | integer     | Identity column. Job pointers and results reference it.                                                                                          |
| `beatmap_id`         | integer     | The `beatmaps.id`. A beatmap delete cascades to this row.                                                                                        |
| `provider`           | text        | `local` or `gcp`. A stored file is valid only under the provider that stored it.                                                                 |
| `storage_key`        | text        | `sha256/<first two hex characters>/<checksum>.osu`. Null until the file is fetched.                                                              |
| `checksum`           | varchar(64) | The SHA-256 of the raw bytes in lowercase hex. Null until the file is fetched.                                                                   |
| `byte_length`        | integer     | The file size in bytes. Null until the file is fetched. The limit is 8 MiB.                                                                      |
| `osu_beatmap_id`     | bigint      | The osu! beatmap ID that was requested.                                                                                                          |
| `source_url`         | text        | `https://osu.ppy.sh/osu/<osu_beatmap_id>`.                                                                                                       |
| `fetch_status`       | integer     | The `DataFetchStatus` value. See [Fetch status](#fetch-status).                                                                                  |
| `last_fetch_attempt` | timestamptz | The time the most recent HTTP request for this row started. Also updated when a download lands on an existing row with the same checksum.        |
| `error_code`         | text        | The download error. Null after a success. See [Error codes](#error-codes).                                                                       |
| `acquired_at`        | timestamptz | The time the bytes were stored. Null until the file is fetched.                                                                                  |
| `source_mode`        | integer     | The `Mode` value from the `[General]` section of the file, 0 to 3. Set after the first calculation. It can be different from `beatmaps.ruleset`. |
| `key_count`          | integer     | The mania key count, read from `CircleSize`. Set only when `source_mode` is 3. A check constraint enforces this rule.                            |

A row with `fetch_status` 2 must have `storage_key`, `checksum`, `byte_length`,
and `acquired_at`. A check constraint enforces this rule.

### `beatmap_attributes`

| Column               | Type             | Meaning                                                                                                                                  |
| -------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | integer          | Identity column.                                                                                                                         |
| `beatmap_id`         | integer          | The `beatmaps.id`.                                                                                                                       |
| `file_id`            | integer          | The `beatmap_files` row that was calculated. Part of a foreign key with `beatmap_id` and `checksum`. A file delete cascades to this row. |
| `checksum`           | varchar(64)      | A copy of the file checksum. Part of the foreign key.                                                                                    |
| `identity`           | text             | A JSON string that identifies the calculation. Unique with `beatmap_id` and `file_id`. See [Result identity](#result-identity).          |
| `ruleset`            | integer          | The target ruleset, 0 to 5.                                                                                                              |
| `mods`               | integer          | The canonical profile: 0, 2, 8, 16, 64, or 1024.                                                                                         |
| `settings`           | jsonb            | The normalized settings: `ruleset`, `mode`, `mods`, `clockRate`, and `lazer`.                                                            |
| `calculator_version` | text             | The calculator that produced the row, for example `rosu-pp-js@4.0.1`.                                                                    |
| `format_version`     | integer          | The result format of the row. The current value is 2.                                                                                    |
| `sr`                 | double precision | The star rating.                                                                                                                         |
| `ar`                 | double precision | The effective approach rate. Set for osu! and catch. Null for other modes.                                                               |
| `od`                 | double precision | The effective overall difficulty. Null for catch.                                                                                        |
| `cs`                 | double precision | The effective circle size. Set for osu! and catch. Null for other modes.                                                                 |
| `hp_drain`           | double precision | The effective HP drain rate.                                                                                                             |
| `bpm`                | double precision | The file BPM multiplied by the clock rate.                                                                                               |
| `max_combo`          | integer          | The maximum combo from the difficulty calculation.                                                                                       |
| `clock_rate`         | double precision | 1 or 1.5.                                                                                                                                |
| `hit_windows`        | jsonb            | `ar`, `odPerfect`, `odGreat`, `odGood`, `odOk`, and `odMeh` in milliseconds. A window that does not apply is null.                       |
| `difficulty`         | jsonb            | Mode-specific values. See the next table.                                                                                                |
| `created`            | timestamptz      | The insert time.                                                                                                                         |

Effective AR and OD keep their fractions and can be outside the editor range.
HR clamps AR, OD, CS, and HP at 10. DT does not clamp. For example, DT on AR 9.3
stores an AR above 10.

The `difficulty` payload always has `version` (the format version) and `mode`.
The other members depend on the mode:

| Mode      | Members                                                           |
| --------- | ----------------------------------------------------------------- |
| 0 (osu!)  | `aim`, `speed`, `flashlight`, `nCircles`, `nSliders`, `nSpinners` |
| 1 (taiko) | `stamina`, `rhythm`, `color`, `reading`                           |
| 2 (catch) | `nFruits`, `nDroplets`, `nTinyDroplets`                           |
| 3 (mania) | `keyCount`, `nObjects`, `nHoldNotes`                              |

### Relations and cascade deletes

Drizzle exposes these relations:

| From                   | Relation               | To                       | Note                                                      |
| ---------------------- | ---------------------- | ------------------------ | --------------------------------------------------------- |
| `beatmaps`             | `beatmapFiles`         | `beatmap_files`          | Many.                                                     |
| `beatmaps`             | `beatmapAttributes`    | `beatmap_attributes`     | Many.                                                     |
| `beatmaps`             | `beatmapAttributeJobs` | `beatmap_attribute_jobs` | Many in Drizzle. The unique index allows at most one row. |
| `beatmapAttributeJobs` | `sourceFile`           | `beatmap_files`          | Through `source_file_id`.                                 |
| `beatmapAttributeJobs` | `acquiredFile`         | `beatmap_files`          | Through `acquired_file_id`.                               |
| `beatmapFiles`         | `attributes`           | `beatmap_attributes`     | Results calculated from this file.                        |
| `beatmapFiles`         | `jobs`                 | `beatmap_attribute_jobs` | Jobs whose results came from this file.                   |
| `beatmapFiles`         | `acquisitionJobs`      | `beatmap_attribute_jobs` | Jobs whose current attempt uses this file.                |
| `beatmapAttributes`    | `file`                 | `beatmap_files`          |                                                           |

All foreign keys use `ON DELETE CASCADE`:

- A `beatmaps` delete removes the job, all files, and all results of that
  beatmap.
- A `beatmap_files` delete removes every result calculated from that file and
  the job row that points to it through `source_file_id` or
  `acquired_file_id`.

Caution: Do not delete a `beatmap_files` row to repair a file. The delete also
removes the job and the results. Reschedule the beatmap with `--refresh-source`
instead.

### Job status

| Status       | Meaning                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pending`    | The job waits for a worker. `next_attempt_at` can be in the future after a retryable failure.                                       |
| `processing` | A worker holds the lease. If `lease_expires_at` is in the past, the worker is gone and the recovery loop can publish the job again. |
| `complete`   | The results for the current generation are committed. `source_file_id` points to the calculated file.                               |
| `failed`     | The retry budget is exhausted or the error was terminal. The row stays for inspection. A reschedule resets it.                      |

### Fetch status

`beatmap_files.fetch_status` uses the `DataFetchStatus` values from
`packages/otr-core/src/db/data-fetch-status.ts`:

| Value | Name         | Meaning for a file row                                                |
| ----- | ------------ | --------------------------------------------------------------------- |
| 0     | `NotFetched` | The default. The worker never leaves a row in this state.             |
| 1     | `Fetching`   | The HTTP request is in progress, or the attempt was abandoned.        |
| 2     | `Fetched`    | The bytes are stored. The checksum, key, size, and time are recorded. |
| 3     | `NotFound`   | osu! returned HTTP 404 or 410. The beatmap has no downloadable file.  |
| 4     | `Error`      | The download failed. `error_code` gives the reason.                   |

`beatmaps.data_fetch_status` uses the same values for API metadata. The two
columns are independent.

### Profiles and settings

A profile is one normalized settings object:

| Member      | Values                                                          | Rule                                                                                 |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `ruleset`   | 0 osu!, 1 taiko, 2 catch, 3 mania other, 4 mania 4K, 5 mania 7K | The o!TR `Ruleset` enum.                                                             |
| `mode`      | 0, 1, 2, or 3                                                   | The `rosu-pp-js` game mode. Derived from `ruleset`. Rulesets 3, 4, and 5 use mode 3. |
| `mods`      | 0 NM, 2 EZ, 8 HD, 16 HR, 64 DT, 1024 FL                         | One canonical profile. NC (512) and NC with DT (576) normalize to DT (64).           |
| `clockRate` | 1 or 1.5                                                        | 1.5 for DT. 1 for all other profiles.                                                |
| `lazer`     | `false`                                                         | Stable behavior only.                                                                |

Default profiles for each ruleset:

| Ruleset     | CLI `--ruleset` | Default profiles       |
| ----------- | --------------- | ---------------------- |
| osu!        | `0`             | NM, HR, HD, EZ, FL, DT |
| taiko       | `1`             | NM, HR, EZ, DT         |
| catch       | `2`             | NM, HR, EZ, DT         |
| mania other | `3`             | NM, DT                 |
| mania 4K    | `4`             | NM, DT                 |
| mania 7K    | `5`             | NM, DT                 |

HD and FL give the same result as NM outside osu! for the pinned calculator.
Mania HR and EZ change effective OD and HP but not stars. They are not defaults.
You can request any of the six profiles for any ruleset with `--mods`.

A job targets one ruleset. Mania 4K and 7K jobs validate the key count that the
calculator reads from the file. A mania file with another key count fails with
`invalid_beatmap_calculation`. There is no automatic conversion between modes.

### Error codes

The worker writes an error code to `beatmap_attribute_jobs.error_code`. A
download error is also written to the `beatmap_files` row of the attempt. A
retryable error schedules another attempt. A terminal error sets the job to
`failed` at once.

Download and storage codes from `storage.ts`:

| Code                   | Retryable | Cause                                                                                                                                                                                                                                                                                                 |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid_id`           | No        | The osu! ID is not a positive safe integer.                                                                                                                                                                                                                                                           |
| `invalid_key`          | No        | A storage key does not match `sha256/<xx>/<checksum>.osu`. Internal.                                                                                                                                                                                                                                  |
| `invalid_file`         | No        | The bytes are not UTF-8, the header is not `osu file format v<n>`, the file has a NUL byte, the `[Metadata]` section does not have exactly one `BeatmapID` equal to the requested ID, a required section is missing, the response is HTML, the body is empty, or a stored file is not a regular file. |
| `checksum_mismatch`    | No        | The stored bytes do not match the recorded checksum.                                                                                                                                                                                                                                                  |
| `too_large`            | No        | The file is larger than 8 MiB.                                                                                                                                                                                                                                                                        |
| `not_found`            | No        | osu! returned HTTP 404 or 410. The file row gets `fetch_status` 3.                                                                                                                                                                                                                                    |
| `download_unavailable` | Depends   | Retryable for HTTP 403, 408, 5xx, and network errors. Terminal for other statuses and for redirects.                                                                                                                                                                                                  |
| `rate_limited`         | Yes       | osu! returned HTTP 429, or the local limiter could not admit the request before the 180-second deadline. `next_attempt_at` honors the cooldown.                                                                                                                                                       |
| `storage_unavailable`  | Yes       | A local read or write failed, or the GCP request failed.                                                                                                                                                                                                                                              |
| `timeout`              | Yes       | One request took longer than 20 seconds, or the acquisition took longer than 180 seconds.                                                                                                                                                                                                             |
| `busy`                 | Yes       | 256 downloads are already pending in this worker process.                                                                                                                                                                                                                                             |

When a stored file fails with `invalid_file`, `checksum_mismatch`, or
`too_large`, the worker treats the file as missing and downloads it again. The
job fails only when the downloaded bytes fail the same checks.

Calculator codes from `calculator-process.ts`:

| Code                                       | Retryable | Cause                                                                                |
| ------------------------------------------ | --------- | ------------------------------------------------------------------------------------ |
| `calculator_requires_linux_memory_monitor` | No        | The worker host is not Linux.                                                        |
| `calculator_start_failed`                  | Yes       | The child process did not start.                                                     |
| `calculator_timeout`                       | Yes       | The child process ran longer than 60 seconds.                                        |
| `calculator_memory_limit`                  | Yes       | The child process used more than 512 MiB of resident memory.                         |
| `calculator_output_limit`                  | Yes       | The child process wrote more than 1 MiB to stdout.                                   |
| `invalid_beatmap_calculation`              | No        | The child process exited with an error. See [Source validation](#source-validation). |
| `invalid_calculator_response`              | Yes       | The child process output was not JSON.                                               |

Service codes from `service.ts`:

| Code                       | Where        | Cause                                                                                                                                                                                                     |
| -------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `processing_failed`        | Job          | An unexpected error without a known code. Retryable. Examples: the calculator returned a different set of profiles, a result did not match its request, or a database statement failed during processing. |
| `attempt_budget_exhausted` | Job and file | The recovery loop found a `processing` job with an expired lease on its fourth attempt. The job is `failed`. Its `Fetching` file row is `Error`.                                                          |
| `obsolete_generation`      | File         | A reschedule abandoned a download that was in progress.                                                                                                                                                   |

### Source validation

The child process rejects a file before calculation when:

- The header is not `osu file format v<n>`.
- `Mode` is not 0 to 3.
- A `[Difficulty]` value is missing or not a number, or `SliderMultiplier` or
  `SliderTickRate` is not positive.
- A timing point has a missing or zero beat length.
- A hit object has fewer than five fields, a non-numeric field, an unknown
  type, or an end time before its start time.
- The file has more than 100,000 hit objects, no hit objects, or no timing
  points.
- `rosu-pp-js` parses a different object count, reports the map as suspicious,
  or returns a non-finite AR, OD, CS, HP, or BPM.
- The target ruleset does not match the native mode, or a mania key count is
  outside 1 to 18.

Each of these cases sets `invalid_beatmap_calculation`, which is terminal.

## Result identity

Each result row is identified by the `identity` column. The value is a JSON
string with these members:

| Member              | Source                                               |
| ------------------- | ---------------------------------------------------- |
| `checksum`          | The SHA-256 of the source file.                      |
| `calculatorVersion` | `beatmap_attribute_jobs.desired_calculator_version`. |
| `formatVersion`     | `beatmap_attribute_jobs.desired_format_version`.     |
| `settings`          | The normalized profile.                              |

`createCalculationIdentity` in `packages/otr-core/src/osu/beatmap-attributes.ts`
builds the string. Do not build it by hand in SQL. Filter on `file_id`,
`ruleset`, `mods`, `calculator_version`, and `format_version` instead.

Identity has these consequences:

- The same file, calculator, format, and profile always map to the same row.
  A repeated schedule inserts nothing and the result `id` values do not change.
- A new checksum, calculator version, or format version produces new rows. Old
  rows stay as history. Nothing deletes them.
- Metadata changes on the `beatmaps` row do not change identity.

`getBeatmapAttribute` in `service.ts` is the lookup for one profile. It returns
a row only when all of these conditions are true:

1. The beatmap has a job.
2. The job's `desired_format_version` equals the running
   `CALCULATION_FORMAT_VERSION`.
3. The job's `source_file_id` points to a row with `fetch_status` 2.
4. A result exists for that file, the job's `desired_calculator_version`, the
   format version, and the normalized profile.

The lookup does not require the job's calculator version to match the running
worker. After a calculator upgrade, lookups keep returning the old results
until the beatmap is recalculated. After a format upgrade, lookups return
nothing until the beatmap is recalculated.

## Job lifecycle

### Schedule a job

`recordBeatmapAttributeIntent` in `service.ts` is the only writer of
`beatmap_attribute_jobs` outside the worker. `scheduleBeatmapAttributes` wraps
it in a transaction for the CLI. The ingestion worker calls it inside its
metadata transaction, so the intent commits together with the metadata.

The function locks the `beatmaps` row and the job row, then applies these
rules:

1. It selects the requested profiles:
   - Explicit `settings` are normalized and used.
   - Without explicit settings, an existing job keeps its profiles unless
     `recalculate` is set.
   - Otherwise, the defaults for `beatmaps.ruleset` are used.
2. If explicit settings target the same ruleset as an existing job, and
   `recalculate` is not set, the new profiles are added to the existing ones.
   A different ruleset replaces them.
3. An existing job keeps its calculator and format version unless
   `recalculate` is set. A new job gets the running versions.
4. Explicit settings on a job with a different version fail with
   `Explicit recalculation is required to change calculator version` unless
   `recalculate` is set.
5. If no job exists, a new row is inserted with generation 1.
6. If a job exists, the row changes only when `recalculate` is set,
   `refreshSource` is set, or the profiles changed. The change:
   - Marks a `Fetching` file of the previous attempt as `Error` with
     `obsolete_generation`.
   - Clears `acquired_file_id` when `refreshSource` is set or the attempt was
     abandoned.
   - Increases `generation` by 1, sets `status` to `pending`, resets
     `attempts` to 0, clears the lease, `published_at`, and `error_code`, and
     sets `next_attempt_at` and `requested_at` to now.
7. Otherwise, the row does not change. The call is a no-op.

`refresh_source` is sticky. A job that was requested with `refreshSource`
keeps the flag through later reschedules until a generation completes.

### Process a job

The worker runs `BeatmapAttributeService.process` for each queue message:

1. Claim. In one transaction, the worker locks the job row and checks that:
   - The message generation equals the row generation.
   - `attempts` is less than 4.
   - `next_attempt_at` is not in the future.
   - The status is `pending`, or `processing` with an expired lease.
   - The job's versions equal the worker's versions.

   If a check fails, the outcome is `obsolete` and nothing changes. Otherwise
   the worker sets `processing`, increases `attempts`, writes a new
   `lease_token`, and sets `lease_expires_at` 120 seconds ahead. A timer renews
   the lease every 15 seconds.

2. Select the bound file. The worker uses `acquired_file_id`. If it is null and
   `refresh_source` is false, it uses `source_file_id`. If the bound file is
   fetched but belongs to another provider, the worker looks for a fetched row
   with the same checksum under its own provider.
3. Acquire the bytes. If the bound file is fetched, the worker reads it from
   storage and validates it. If the read succeeds, the file is reused. If the
   file is missing, invalid, or has a different checksum, or if there is no
   bound file, the worker downloads:
   - Before the HTTP request, it locks the job again, and inserts a new file
     row with `fetch_status` 1 or reuses the unfetched bound row. It writes the
     row ID to `acquired_file_id`. The recovery loop can now see the attempt.
   - The downloader admits the request through the limiter, then fetches with
     a 20-second timeout and an 8 MiB cap.
   - The worker validates the bytes, computes the checksum, and stores the file
     under `sha256/<xx>/<checksum>.osu`. The local provider writes a temporary
     file, syncs it, and renames it.
4. Checkpoint the file. In one transaction, the worker locks the job again and:
   - If a fetched row with the same checksum already exists for this provider,
     it updates that row's `last_fetch_attempt`, points `acquired_file_id` to
     it, and deletes the attempt row.
   - Otherwise, it sets the attempt row to `fetch_status` 2 with the checksum,
     key, size, and time.
5. Calculate. The worker loads the result rows that already exist for this file
   and the requested identities. If profiles are missing, it starts one child
   process with the bytes and the missing profiles. The child parses the file
   one time and returns all results. The worker checks that the child returned
   exactly the requested profiles, with matching clock rate, mode, and key
   count.
6. Commit. In one transaction, the worker locks the job again and:
   - Writes `source_mode` and `key_count` to the file row.
   - Inserts the new result rows with `ON CONFLICT DO NOTHING`.
   - Sets the job to `complete`, points `source_file_id` to the file, sets
     `refresh_source` to false, and clears the lease and `error_code`.

Every transaction after the claim filters on the job ID, the generation, and
the lease token. If a reschedule or the recovery loop changed the row, the
filter matches nothing, the worker stops with outcome `obsolete`, and it does
not write results.

### Handle a failure

When a step throws:

1. The worker reads the `retryable` flag of the error. An error without the
   flag is retryable.
2. A retryable error on attempt 1, 2, or 3 sets `status` to `pending` and
   `next_attempt_at` to now plus 15, 30, or 60 seconds. A `retryNotBefore`
   time from a rate limit replaces the delay when it is later.
3. A retryable error on attempt 4, or a terminal error on any attempt, sets
   `status` to `failed`.
4. The file row of the attempt, when it is still `Fetching`, becomes
   `NotFound` for `not_found` and `Error` for every other code.
5. `published_at` is cleared so the recovery loop can publish the retry.

The previous `source_file_id` and its results are not changed by a failure.

### Recovery loop

`BeatmapAttributeService.reconcile` runs every 15 seconds in the worker, and
one time at the end of each CLI command that schedules work. `--inspect` does
not run it. Each pass:

1. Sets every `processing` job with an expired lease and 4 attempts to `failed`
   with `attempt_budget_exhausted`. Sets its `Fetching` file row to `Error`
   with the same code.
2. Selects up to 25 jobs that match the running versions, are due, have fewer
   than 4 attempts, are `pending` or `processing` with an expired lease, and
   were never published or were published more than 60 seconds ago. The order
   is `requested_at`.
3. For each job, updates `published_at` with a compare-and-set on the previous
   value, then publishes `{ jobId, generation }`. A concurrent pass that loses
   the compare-and-set skips the job.

The loop never inserts jobs and never reads `beatmaps`. Enabling the worker
does not backfill.

### Queue

| Property        | Value                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Queue name      | `processing.attributes.beatmaps` (`QueueConstants.beatmapAttributes`)                                                                         |
| Declaration     | Durable, with the shared priority arguments.                                                                                                  |
| Payload         | `{ jobId: string, generation: number }` plus the standard envelope metadata `requestedAt`, `correlationId`, and `priority`.                   |
| Schema          | `ProcessBeatmapAttributesPayloadSchema` in `packages/otr-core/src/messages/beatmap-attributes.ts`.                                            |
| Publisher       | `RabbitMqPublisher` with confirms. Messages are persistent and carry trace headers.                                                           |
| Consumer        | `RabbitMqConsumer` with `prefetch` equal to `BEATMAP_ATTRIBUTES_CONCURRENCY`.                                                                 |
| Acknowledgement | The worker acks after `process` returns, for every outcome including `obsolete` and `failed`. Retries go through the database, not the queue. |
| Invalid payload | The worker nacks without requeue. The message is dropped.                                                                                     |
| Thrown error    | The consumer nacks with requeue. This happens when the database is unavailable during the claim or the failure write.                         |

Duplicate messages are normal. When the backlog is longer than 60 seconds of
work, the recovery loop publishes the oldest unclaimed jobs again. The worker
claims the first copy and treats the later copies as `obsolete`. Queue depth
during a large batch is therefore higher than the number of pending jobs.

```mermaid
stateDiagram-v2
    [*] --> pending: intent recorded
    pending --> processing: worker claims, attempts + 1
    processing --> complete: results committed
    processing --> pending: retryable error, attempts < 4
    processing --> failed: terminal error, or attempts = 4
    processing --> failed: lease expired at attempts = 4
    complete --> pending: reschedule, generation + 1
    failed --> pending: reschedule, generation + 1
```

```mermaid
flowchart LR
    I[Ingestion worker<br/>metadata transaction] -->|recordBeatmapAttributeIntent| J[(beatmap_attribute_jobs)]
    C[CLI] -->|scheduleBeatmapAttributes| J
    R[Recovery loop<br/>every 15 s] -->|reads due jobs| J
    R -->|jobId, generation| Q[processing.attributes.beatmaps]
    Q --> W[Attributes worker]
    W -->|claim, lease| J
    W -->|read or download| F[(beatmap_files)]
    W -->|child process| K[rosu-pp-js]
    K --> W
    W -->|insert| A[(beatmap_attributes)]
```

## Situations that download a file again

A download happens when the worker has no intact stored file for the job, or
when the job requires a fresh copy. The table lists each situation.

| Situation                                                                                                                      | Generation | Download                              | Calculation                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| First job for a beatmap                                                                                                        | 1          | Yes                                   | All requested profiles                                                                    |
| Metadata ingestion for a beatmap that already has a job, with the flag on                                                      | +1         | Yes. Ingestion sets `refresh_source`. | Only profiles with no result for the new checksum. None when the checksum did not change. |
| `--refresh-source`                                                                                                             | +1         | Yes                                   | Same as above                                                                             |
| `--recalculate` with an intact stored file                                                                                     | +1         | No                                    | Profiles with no result for the running versions                                          |
| `--recalculate` after the stored file was lost                                                                                 | +1         | Yes                                   | Same as above                                                                             |
| Stored file missing, corrupt, a symbolic link, or larger than 8 MiB                                                            | None       | Yes                                   | Reuses results when the checksum did not change                                           |
| The worker's provider differs from the file's provider, and no fetched row with that checksum exists for the worker's provider | None       | Yes                                   | Reuses results only through a matching row                                                |
| `--mods` adds profiles to a job with the same ruleset                                                                          | +1         | No                                    | The new profiles                                                                          |
| `--ruleset` differs from the job's ruleset                                                                                     | +1         | No                                    | All profiles of the new ruleset                                                           |
| Retry after a retryable download error                                                                                         | None       | Yes                                   | All requested profiles                                                                    |
| Retry after a retryable calculator error                                                                                       | None       | No. The file was checkpointed.        | All requested profiles                                                                    |
| Lease expiry and republish                                                                                                     | None       | Only if the file was not checkpointed | Profiles with no result                                                                   |

These situations do not download and do not calculate:

- The same request again. `--osu-id` with the same profiles, or a batch pass
  over beatmaps that already have a job, changes nothing.
- A deploy, a worker restart, or setting `BEATMAP_ATTRIBUTES_ENABLED=true`.
- A calculator or format version change. Existing jobs keep their versions
  until an operator recalculates them.
- `--inspect`.

### Metadata fetches in production

With `BEATMAP_ATTRIBUTES_ENABLED=true` on the ingestion worker, every
successful beatmap metadata fetch records intent. The fetch service upserts
every difficulty of the beatmapset, so it records intent for every difficulty
that exists in `beatmaps`, not only the requested one. A beatmap with
`manual_override` is skipped.

These paths publish a beatmap metadata fetch:

| Trigger                                                                        | Which beatmaps                                                                               |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Match ingestion (`match-fetch-service.ts`)                                     | Beatmaps of the match games whose `data_fetch_status` is `NotFetched`. Usually new beatmaps. |
| Multiplayer room ingestion (`room-fetch-service.ts`)                           | Same rule.                                                                                   |
| Tournament submission (`tournamentSubmissionProcedure.ts`)                     | Pooled beatmaps of the submission that do not exist in `beatmaps` yet.                       |
| Admin pooled beatmap edits (`beatmapAdminProcedures.ts`)                       | Added beatmaps that do not exist in `beatmaps`, or whose status is `NotFetched` or `Error`.  |
| Admin refetch beatmap data for a tournament (`tournaments/adminProcedures.ts`) | Every pooled beatmap of the tournament that is not `NotFound`.                               |
| Admin mass enqueue (`massEnqueueProcedures.ts`)                                | Selected beatmaps that exist in `beatmaps` and are not `NotFound`.                           |

An admin refetch of a tournament with 200 pooled beatmaps therefore causes up
to 200 downloads plus the other difficulties of those beatmapsets. It causes no
calculation for files whose checksum did not change.

## Update `rosu-pp-js`

A calculator upgrade is an operator rollout. The pipeline does not detect a
new version and does not rebuild by itself.

### Procedure

1. Stop every attributes worker. A worker claims only jobs that match its
   versions, but a mixed fleet makes the backfill hard to reason about.
2. Change the version pin in `apps/data-worker/package.json`.
3. Run `bun install` to update `bun.lock`.
4. Set `CALCULATOR_VERSION` in
   `apps/data-worker/src/beatmap-attributes/calculator-version.ts` to
   `rosu-pp-js@<new version>`.
5. Decide whether the format version changes. Keep it when only the numbers
   change. Change it when the meaning of a stored column changes, or when the
   shape of `hit_windows` or `difficulty` changes.
6. For a format change, increase `CALCULATION_FORMAT_VERSION` in
   `packages/otr-core/src/osu/beatmap-attributes.ts`.
7. For a shape change, update the difficulty schemas in the same file and
   `difficultyPayload` in `calculator.ts`.
8. Run the tests. Update the expected values in `calculator.test.ts` and
   `service.integration.test.ts` when the library changed its results.
9. Deploy the new worker image. No migration is necessary.
10. Recalculate every fetched beatmap in batches:

    ```sh
    bun run --cwd apps/data-worker attributes --batch-size 100 --recalculate
    bun run --cwd apps/data-worker attributes --batch-size 100 --after-id <nextAfterId> --recalculate
    ```

    Repeat with the returned `nextAfterId` until `scheduled` is 0.

### Effects on existing data

| Item                                               | Effect                                                                                                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing jobs                                      | Keep their old `desired_calculator_version` and `desired_format_version`. The new worker does not claim them. The recovery loop does not publish them.                                              |
| New beatmaps                                       | Get the new versions on their first job.                                                                                                                                                            |
| Metadata ingestion for an existing job             | Keeps the old versions, sets `refresh_source`, and increases the generation. The job becomes `pending` and stays `pending` until an operator recalculates it. Run the batch soon after the rollout. |
| `attributes --osu-id <id>` without `--recalculate` | Fails on a job with old versions: `Explicit recalculation is required to change calculator version`.                                                                                                |
| Lookups after a calculator-only change             | Keep returning the old results until recalculation.                                                                                                                                                 |
| Lookups after a format change                      | Return nothing until recalculation.                                                                                                                                                                 |
| Old result rows                                    | Stay in `beatmap_attributes` as history. Nothing deletes them.                                                                                                                                      |
| Stored files                                       | Are reused. The backfill downloads only files that are missing or corrupt.                                                                                                                          |

## Configuration

The CLI and the worker call `loadRootEnv`, which reads the `.env` file in the
repository root. Docker Compose passes the same file with `env_file`.

| Variable                               | Required             | Meaning                                                                                                                                                                                                          |
| -------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BEATMAP_ATTRIBUTES_ENABLED`           | No. Default `false`. | `true` makes the ingestion worker record intent and lets the CLI and the attributes worker start. Only `true` and `false` are accepted.                                                                          |
| `BEATMAP_ATTRIBUTES_STORAGE`           | When enabled         | `local` or `gcp`. There is no fallback between providers.                                                                                                                                                        |
| `BEATMAP_ATTRIBUTES_LOCAL_DIR`         | For `local`          | An absolute directory. Files are written with mode 0600 in directories with mode 0700.                                                                                                                           |
| `BEATMAP_ATTRIBUTES_GCP_BUCKET`        | For `gcp`            | An existing bucket. The worker checks at startup that it can list objects in it.                                                                                                                                 |
| `BEATMAP_ATTRIBUTES_GCP_CREDENTIALS`   | No                   | A service account key for `gcp`, as the JSON file content or its base64 encoding. Blank uses ambient credentials: `GOOGLE_APPLICATION_CREDENTIALS`, or the identity of a Google Cloud host. Ignored for `local`. |
| `BEATMAP_ATTRIBUTES_CONCURRENCY`       | No. Default `2`.     | Active jobs and calculator processes for each worker, 1 to 4. Also the queue prefetch. Downloads use at most 2.                                                                                                  |
| `METRICS_PORT`                         | No. Default `9092`.  | The attributes worker's `/health` and `/metrics` port. The ingestion worker reads the same variable with default `9091`, so do not set it when both run on one host.                                             |
| `DATABASE_URL`                         | Yes                  | The PostgreSQL connection string. The pool size is concurrency plus 2, with a 30-second statement timeout.                                                                                                       |
| `RABBITMQ_AMQP_URL`                    | Yes                  | The broker URL.                                                                                                                                                                                                  |
| `BEATMAP_ATTRIBUTES_TEST_DATABASE_URL` | Tests only           | Enables `service.integration.test.ts`. Port `5432` is rejected outside GitHub Actions.                                                                                                                           |
| `BEATMAP_ATTRIBUTES_TEST_GCS_ENDPOINT` | Tests only           | Enables `gcp-storage.integration.test.ts` against a local emulator, for example `http://127.0.0.1:4443`. Only `127.0.0.1` and `localhost` are accepted.                                                          |

Caution: A blank value such as `BEATMAP_ATTRIBUTES_ENABLED=` is not the same as
an absent variable. `attributesEnabled` rejects it, and the ingestion worker
stops at startup. Remove the line or set `false`. See
[issue #900](https://github.com/osu-tournament-rating/otr-web/issues/900).

The ingestion worker needs only `BEATMAP_ATTRIBUTES_ENABLED`. It does not read
the storage variables. The CLI and the attributes worker need all of them.

### Startup checks

The CLI and the attributes worker check the storage before they connect to
the database. The `local` provider creates the directory and checks that it is
writable. The `gcp` provider lists one object under `sha256/` in the bucket.
The process stops with one of these messages when the check fails:

| Message                                                         | Cause                                                                       |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `GCP beatmap bucket "<name>" does not exist`                    | The bucket name is wrong.                                                   |
| `GCP beatmap bucket "<name>" denied access`                     | The service account lacks a permission.                                     |
| `GCP beatmap bucket "<name>" check failed: <reason>`            | The credentials could not be loaded or used, or the service is unreachable. |
| `Local beatmap storage path <path> is not a writable directory` | The directory cannot be created or written.                                 |

In Compose, the container restarts until the configuration is fixed. The
messages never contain the credential value.

## Run and test locally

### Prerequisites

- Linux.
- Bun with the repository dependencies installed.
- A RabbitMQ broker that belongs to this task. Do not reuse another task's
  broker.
- A disposable PostgreSQL database from `otr-scripts` `template-db` on port
  `5434`, migrated with this checkout. Never use port `5432`.
- No osu! OAuth credentials. The `.osu` download is unauthenticated. The
  `local` provider needs no GCP credentials.

### Set up

1. Create the database clone from the `otr-scripts` root. Give it this
   checkout so that the clone gets the migrations of this branch:

   ```sh
   uv run python src/main.py --script template-db --template-action create --template-name <name> --template-web-dir <this checkout>
   ```

2. Put these values in the `.env` file at the repository root:

   ```sh
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5434/<name>
   RABBITMQ_AMQP_URL=amqp://<user>:<password>@127.0.0.1:<port>/
   BEATMAP_ATTRIBUTES_ENABLED=true
   BEATMAP_ATTRIBUTES_STORAGE=local
   BEATMAP_ATTRIBUTES_LOCAL_DIR=/tmp/beatmap-files
   BEATMAP_ATTRIBUTES_CONCURRENCY=2
   ```

   Do not set `METRICS_PORT` in this file when both workers run on one host.
   Both workers read the same variable. Without it, the ingestion worker
   listens on `9091` and the attributes worker on `9092`. `.env.example` ships
   `METRICS_PORT=9091`, so remove that line, or start the attributes worker
   with `METRICS_PORT=9092 bun run --cwd apps/data-worker attributes:worker`.

3. If the clone's migrations are behind this checkout, apply them from the
   repository root. `drizzle-kit` uses the `DATABASE_URL` exported in your
   shell when there is one, and the `.env` value otherwise. Print the
   effective value and confirm that it points to port `5434` before you run
   the migration:

   ```sh
   echo "${DATABASE_URL:-<.env value>}"
   bunx drizzle-kit migrate
   ```

4. Confirm that the migrations created the tables and that `beatmap_attributes`
   is empty:

   ```sh
   psql postgresql://postgres:postgres@127.0.0.1:5434/<name> -c "select count(*) from beatmap_attributes" -c "\d beatmap_files"
   ```

### Start the worker

Start the consumer in its own terminal:

```sh
bun run --cwd apps/data-worker attributes:worker
```

Confirm that it is healthy:

```sh
curl -s localhost:9092/health
```

The worker logs `Beatmap attribute job processed` with the outcome for each
message.

### Schedule and inspect one beatmap

Schedule the default profiles for one osu! beatmap. The command returns after
it records the job and publishes it:

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --ruleset 0
```

Inspect the beatmap. Inspection never creates a beatmap and never schedules
work:

```sh
bun run --cwd apps/data-worker attributes --osu-id 2785319 --inspect
```

The output has the `beatmaps` row with its `beatmapFiles`,
`beatmapAttributes`, and `beatmapAttributeJobs` relations, and `resolved`,
which is the `getBeatmapAttribute` result for each default profile.

Run the schedule command again. The job does not change and the result `id`
values stay the same.

Other single-beatmap commands:

| Command                                      | Effect                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `attributes --osu-id <id>`                   | Schedules the default profiles for `beatmaps.ruleset`.                                                        |
| `attributes --osu-id <id> --ruleset <n>`     | Targets ruleset `n`. Replaces the profiles when the ruleset changes.                                          |
| `attributes --osu-id <id> --mods 64,512,576` | Requests explicit profiles. All three values normalize to DT and produce one result.                          |
| `attributes --osu-id <id> --recalculate`     | Resets the attempts, adopts the running versions, and replaces the profiles with the request or the defaults. |
| `attributes --osu-id <id> --refresh-source`  | Downloads the file again even when a stored copy exists.                                                      |
| `attributes --osu-id <id> --inspect`         | Prints the rows and the resolved results. Cannot be combined with scheduling flags.                           |

If the osu! ID does not exist in `beatmaps`, the schedule command inserts a
placeholder row with `diff_name` `Pending fetch` and `data_fetch_status` 0. It
does not fetch metadata. Batch mode skips placeholders.

### Watch the tables

Run this query in a loop, for example with `watch -n2`, to follow one beatmap.
Replace `2785319` with the osu! ID:

```sql
select b.id, b.osu_id, b.ruleset, b.data_fetch_status, left(b.diff_name, 24) as diff, b.sr
from beatmaps b where b.osu_id = 2785319;

select j.status, j.generation, j.attempts, j.error_code, j.refresh_source,
       j.acquired_file_id, j.source_file_id, j.published_at, j.lease_expires_at, j.next_attempt_at
from beatmap_attribute_jobs j join beatmaps b on b.id = j.beatmap_id where b.osu_id = 2785319;

select f.id, f.provider, f.fetch_status, f.error_code, f.byte_length, left(f.checksum, 12) as checksum,
       f.source_mode, f.key_count, f.last_fetch_attempt, f.acquired_at
from beatmap_files f join beatmaps b on b.id = f.beatmap_id where b.osu_id = 2785319 order by f.id;

select a.id, a.file_id, a.ruleset, a.mods, a.sr, a.ar, a.od, a.cs, a.hp_drain, a.bpm, a.max_combo,
       a.clock_rate, a.calculator_version, a.format_version
from beatmap_attributes a join beatmaps b on b.id = a.beatmap_id where b.osu_id = 2785319 order by a.file_id, a.mods;
```

Expected sequence for a new osu! beatmap:

1. The job appears as `pending` with generation 1 and no file.
2. The job becomes `processing`. A file row appears with `fetch_status` 1 and
   `acquired_file_id` points to it.
3. The file row becomes `fetch_status` 2 with a checksum and a size.
4. Six result rows appear with mods 0, 2, 8, 16, 64, and 1024, all with the
   same `file_id`. The DT row has `clock_rate` 1.5 and a BPM 1.5 times the NM
   row.
5. The job becomes `complete`. `source_file_id` equals `acquired_file_id`.
   `refresh_source` is false. The file row has `source_mode` 0.

Aggregate queries for a batch:

```sql
select status, error_code, count(*) from beatmap_attribute_jobs group by 1, 2 order by 1, 2;
select fetch_status, error_code, count(*) from beatmap_files group by 1, 2 order by 1, 2;
select count(*) from beatmap_attributes;
```

Queue depth, including duplicates:

```sh
rabbitmqctl list_queues name messages
```

### Schedule a batch

Batch mode schedules fetched beatmaps in `beatmaps.id` order, at most 100 for
each call. It prints `scheduled` and `nextAfterId`. This loop schedules 5,000
beatmaps:

```sh
after=0
for i in $(seq 50); do
  out=$(bun run --cwd apps/data-worker attributes --batch-size 100 --after-id "$after" 2>/dev/null | tail -1)
  echo "$out"
  after=$(echo "$out" | jq -r .nextAfterId)
  [ "$after" = null ] && break
done
```

Each call publishes at most 25 jobs itself. The worker's recovery loop
publishes the rest, 25 every 15 seconds. The download limiter admits 60
requests a minute, so one worker completes about 60 beatmaps a minute and 5,000
beatmaps in about 85 minutes. Add `--recalculate` to reset the versions and
attempts of existing jobs. Add `--refresh-source` to download every file
again. Without either flag, a beatmap that already has a job is not changed.

### Simulate failures and refetches

| Scenario                 | Steps                                                                                                                                                                   | Expected result                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing file             | Delete the file under `BEATMAP_ATTRIBUTES_LOCAL_DIR/sha256/<xx>/`. Run the schedule command with `--recalculate`.                                                       | The worker downloads again. The checksum matches, so it reuses the same file row and inserts no results. The generation is +1.                     |
| Corrupt file             | Overwrite the stored file with other text. Run the schedule command with `--recalculate`.                                                                               | The read fails with `checksum_mismatch`. The worker downloads again and reuses the row and the results.                                            |
| Forced refresh           | Run the schedule command with `--refresh-source`.                                                                                                                       | A new file row appears with `fetch_status` 1, then is deleted when the checksum matches the existing row. The job completes with the same results. |
| Missing beatmap upstream | Run `attributes --osu-id 999999999`.                                                                                                                                    | A placeholder beatmap appears. The file row has `fetch_status` 3 and `not_found`. The job is `failed` with `not_found` after one attempt.          |
| Mania key mismatch       | Run `attributes --osu-id 1638954 --ruleset 5`.                                                                                                                          | The file is fetched. The job is `failed` with `invalid_beatmap_calculation`.                                                                       |
| Worker crash             | Schedule a beatmap. Kill the worker with `SIGKILL` while the job is `processing`. Wait 120 seconds. Start the worker again.                                             | The recovery loop republishes the job. The retry reuses the checkpointed file when the crash happened after the checkpoint.                        |
| Retry budget             | Stop the network, then schedule a beatmap with `--refresh-source`.                                                                                                      | The job returns to `pending` with `download_unavailable` and increasing `next_attempt_at`. After the fourth attempt it is `failed`.                |
| Ingestion path           | Set `DATA_WORKER_OSU_CLIENT_ID` and `DATA_WORKER_OSU_CLIENT_SECRET`, start `bun run --cwd apps/data-worker start`, and publish a beatmap fetch to the `data.osu` queue. | Every difficulty of the beatmapset gets a job with `refresh_source` true, the same way production does.                                            |

### Run the automated tests

Unit tests need no database:

```sh
bun test apps/data-worker/src/beatmap-attributes packages/otr-core/src/osu packages/otr-core/src/db
```

The integration test uses a real database, the local provider, and a fake
downloader. It creates its own beatmaps and deletes them at the end. It does
not need the worker or a broker:

```sh
BEATMAP_ATTRIBUTES_TEST_DATABASE_URL="$DATABASE_URL" bun test apps/data-worker/src/beatmap-attributes/service.integration.test.ts
```

The calculator tests use the five fixtures in `calculator-fixtures/`. They
assert real `rosu-pp-js` values, so a library upgrade can change them.

### Test the GCP provider with an emulator

The GCP provider test uses the `fake-gcs-server` emulator. Start it, run the
test with its endpoint, then stop it:

```sh
docker run --rm -d --name otr-fake-gcs -p 127.0.0.1:4443:4443 fsouza/fake-gcs-server -scheme http -port 4443 -external-url http://127.0.0.1:4443 -public-host 127.0.0.1:4443
BEATMAP_ATTRIBUTES_TEST_GCS_ENDPOINT=http://127.0.0.1:4443 bun test apps/data-worker/src/beatmap-attributes/gcp-storage.integration.test.ts
docker stop otr-fake-gcs
```

The test creates its own bucket and deletes it at the end. It covers the
startup check, an upload and a read, the immutability precondition, a corrupted
object, an oversized object, and a missing bucket. Do not set
`STORAGE_EMULATOR_HOST`. The SDK builds wrong request paths with it.

## Deploy and operate

### Deployment

The attributes worker is the `beatmap-attributes-worker` service in
`docker-compose.yml` and `docker-compose-staging.yml`. It runs the same
`otr-data-worker` image as `data-worker` with the `attributes:worker` command,
so the CLI also runs inside its container. The service belongs to the
`beatmap-attributes` Compose profile and does not start with the default stack.

The service reads the shared `.env` with `env_file`, so the storage provider,
the bucket, and the concurrency come from that file. The service sets these
values itself:

| Setting                        | Value                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `METRICS_PORT`                 | `9092`                                                                                            |
| `BEATMAP_ATTRIBUTES_LOCAL_DIR` | `/var/lib/otr/beatmap-files`, on the `beatmap-files` named volume. Ignored for `gcp`.             |
| `OTEL_SERVICE_NAME`            | `otr-beatmap-attributes-worker`                                                                   |
| Container name                 | `otr-beatmap-attributes-worker` in production, `otr-staging-beatmap-attributes-worker` in staging |

The deploy workflow decides whether the profile runs. It reads the last
`BEATMAP_ATTRIBUTES_ENABLED` line in the deployed `.env`. When the value is
`true`, bare or quoted, the workflow pulls and starts the worker with the rest
of the stack. For any other value, or when the line is absent, the workflow
removes the worker's container. The ingestion worker reads the same flag to
record intent, so intent and the consumer switch together.

To enable the pipeline in an environment:

1. Set `BEATMAP_ATTRIBUTES_ENABLED=true`, `BEATMAP_ATTRIBUTES_STORAGE`, and the
   variable of the selected provider in the deployed `.env`.
2. Deploy. The migrate step applies the migrations before the stack starts.
   Intent rows accumulate without harm while the attributes worker is down.
3. Restart Prometheus one time after the deploy that adds the
   `beatmap-attributes-worker` scrape job:

   ```sh
   docker compose restart prometheus
   ```

4. Backfill existing beatmaps with the batch command when you want historical
   results. Nothing starts this for you.

To start the worker by hand between deploys:

```sh
docker compose --profile beatmap-attributes up -d beatmap-attributes-worker
```

Run operator commands inside the container:

```sh
docker exec otr-beatmap-attributes-worker bun run --cwd apps/data-worker attributes --osu-id 2785319 --inspect
```

### GCP storage

To use a bucket instead of the local volume:

1. Create a bucket with uniform bucket-level access and no public access. The
   pipeline needs no lifecycle rule, versioning, or retention policy.
2. Create a service account. Grant it `roles/storage.objectUser` on the bucket
   only. The worker needs `storage.objects.get`, `storage.objects.create`, and
   `storage.objects.list`.
3. Create a JSON key for the service account and encode it:

   ```sh
   base64 -w0 key.json
   ```

4. Put these values in the deployed `.env`:

   ```sh
   BEATMAP_ATTRIBUTES_STORAGE=gcp
   BEATMAP_ATTRIBUTES_GCP_BUCKET=<bucket>
   BEATMAP_ATTRIBUTES_GCP_CREDENTIALS=<base64 output>
   ```

5. Deploy. The worker checks bucket access at startup. See
   [Startup checks](#startup-checks).

A blank `BEATMAP_ATTRIBUTES_GCP_CREDENTIALS` uses ambient credentials. That
works with `GOOGLE_APPLICATION_CREDENTIALS` when the container can read the
key file, or on a Google Cloud host. The Compose services do not mount a key
file.

Objects are stored at `sha256/<xx>/<checksum>.osu` with content type
`text/plain; charset=utf-8` and a `sha256` metadata entry. An upload sets
`ifGenerationMatch: 0`, so an existing object is never overwritten. A concurrent
upload of the same key gets HTTP 412. The worker then reads the existing object
and verifies its checksum. The client does not retry a request. The worker
retries a failed job through the database.

The provider was verified against the `fake-gcs-server` emulator. It has not
been run against a live bucket.

### Limits and capacity

All limits are for one worker process. Account for the number of instances
before you raise concurrency.

| Limit                | Value                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Active jobs          | `BEATMAP_ATTRIBUTES_CONCURRENCY`, 1 to 4                                                                |
| Concurrent downloads | The smaller of concurrency and 2                                                                        |
| Download admissions  | 60 a minute in a fixed window                                                                           |
| HTTP 429 handling    | Backoff from 8 seconds, doubled for each try, honors `Retry-After`. At most 5 tries in one acquisition. |
| One HTTP request     | 20 seconds                                                                                              |
| One acquisition      | 180 seconds                                                                                             |
| File size            | 8 MiB                                                                                                   |
| Hit objects          | 100,000                                                                                                 |
| Calculator time      | 60 seconds                                                                                              |
| Calculator memory    | 512 MiB resident                                                                                        |
| Calculator output    | 1 MiB                                                                                                   |
| Job attempts         | 4 for each generation, with 15, 30, and 60 second delays                                                |
| Lease                | 120 seconds, renewed every 15 seconds                                                                   |
| Recovery loop        | Every 15 seconds, 25 jobs for each pass, republish after 60 seconds                                     |
| Database pool        | Concurrency plus 2 connections, 30-second statement timeout                                             |

Throughput is bound by the download limiter at about 60 beatmaps a minute for
each worker. In September 2026 the database had about 280,000 fetched beatmaps,
which is about 78 hours of continuous work for one worker and about 1.35
million result rows. In a small sample, one stored file was about 25 KB.

### Monitoring

The worker serves `/health` and `/metrics` on `METRICS_PORT`. In Compose,
Prometheus scrapes it through the `beatmap-attributes-worker` job on
`otr-beatmap-attributes-worker:9092`. While the profile is off, that target
stays down. Useful series:

| Series                                       | Labels                                             |
| -------------------------------------------- | -------------------------------------------------- |
| `data_worker_queue_messages_processed_total` | `queue="processing.attributes.beatmaps"`, `status` |
| `data_worker_queue_messages_in_flight`       | `queue="processing.attributes.beatmaps"`           |
| `data_worker_queue_message_duration_seconds` | `queue="processing.attributes.beatmaps"`           |
| `data_worker_rate_limiter_requests_total`    | `limiter="beatmap-files"`                          |
| `data_worker_rate_limiter_remaining_tokens`  | `limiter="beatmap-files"`                          |
| `data_worker_rate_limiter_wait_seconds`      | `limiter="beatmap-files"`                          |

Useful database checks:

```sql
-- Jobs that no worker will claim because their versions are stale.
select count(*) from beatmap_attribute_jobs
where desired_calculator_version <> 'rosu-pp-js@4.0.1' or desired_format_version <> 2;

-- Failed jobs by reason.
select error_code, count(*) from beatmap_attribute_jobs where status = 'failed' group by 1 order by 2 desc;

-- Jobs whose lease expired more than 10 minutes ago. The recovery loop should have handled them.
select id, beatmap_id, attempts, lease_expires_at from beatmap_attribute_jobs
where status = 'processing' and lease_expires_at < now() - interval '10 minutes';

-- Downloads that are marked in progress but have no active job.
select f.id, f.beatmap_id, f.last_fetch_attempt from beatmap_files f
left join beatmap_attribute_jobs j on j.acquired_file_id = f.id and j.status = 'processing'
where f.fetch_status = 1 and j.id is null;
```

Logs carry `traceId`. Procedure spans wrap the Drizzle statements, and queue
messages carry trace context.

### Storage

- Files are shared across profiles and across generations. A beatmap with an
  unchanged upstream file has one stored file.
- There is no garbage collection. Old files and old result rows stay.
- The local provider writes each file one time, atomically. A file that
  already exists with the correct checksum is not written again.
- The local directory must survive restarts when you want to avoid downloads
  again. `/tmp` can be cleared on reboot. Mount a persistent volume. The Compose
  service uses the `beatmap-files` named volume. The volume has no retention,
  so watch host disk space.
- A provider switch reuses only files with the same checksum under the new
  provider, which means a new download for every beatmap.
- GCP errors never fall back to local storage.

### Cautions

- Enabling the pipeline does not backfill. Only the batch command schedules
  existing beatmaps.
- Deleting a `beatmap_files` row deletes the job and the results of that
  beatmap.
- A blank `BEATMAP_ATTRIBUTES_ENABLED=` stops the ingestion worker at startup.
- A missing bucket, denied access, or an unwritable local directory stops the
  CLI and the attributes worker at startup.
- Every metadata refetch of an existing beatmap downloads its file again. Plan
  admin mass refetches with the download rate in mind.
- After a calculator upgrade, run the recalculation batch soon. Until then,
  refetched beatmaps stay `pending` and single-beatmap commands need
  `--recalculate`.
- The calculator child process gets only `PATH` and `NODE_ENV` from the
  environment.

## Glossary

| Term          | Meaning                                                                              |
| ------------- | ------------------------------------------------------------------------------------ |
| Attempt       | One claim of a job by a worker. A generation allows 4.                               |
| Checkpoint    | A database write that records progress so a retry can continue from it.              |
| Generation    | The version of a job's request. Each change to the request increases it.             |
| Identity      | The JSON string that identifies one result by file, calculator, format, and profile. |
| Intent        | A `beatmap_attribute_jobs` row. It says that a beatmap needs results.                |
| Lease         | A time-limited claim on a job by one worker.                                         |
| Profile       | One normalized settings object: ruleset, mode, mods, clock rate, and lazer flag.     |
| Provider      | The storage backend, `local` or `gcp`.                                               |
| Recovery loop | The periodic pass that fails exhausted jobs and publishes due jobs.                  |
| Source file   | The `beatmap_files` row that a job's committed results came from.                    |
