This guide explains how to regenerate player ratings from publicly available datasets as they were at the time of the snapshot. This enables independent verification of tournaments which use the platform for filtering and/or seeding. The [`otr-replay`](https://github.com/osu-tournament-rating/otr-replay) tool performs the entire procedure automatically; however, the equivalent manual process is also documented.

Throughout this guide, the **"effective date"** is the point in time that ratings are generated for. This is usually the moment a tournament closes registrations, or another date the tournament announces for capturing ratings of registrants. All dates and times are in UTC.

Ratings are reproduced exactly as they were at the instant the database snapshot was created. `otr-replay` automatically selects the newest public snapshot available at or before the effective date, so every effective date covered by the same snapshot produces identical output.

## Using otr-replay

`otr-replay` requires [Docker](https://www.docker.com/get-started/) and [uv](https://docs.astral.sh/uv/).

1. Clone the [otr-replay](https://github.com/osu-tournament-rating/otr-replay) repository: `git clone https://github.com/osu-tournament-rating/otr-replay.git`.
1. From the repository root, run the program with the effective date as a timestamp. Replace the example date in the command below with the effective date. Timestamps use the format `YYYY-MM-DDTHH:MM[:SS][Z]` and are always interpreted as UTC, so a replica timestamp such as `2026-08-08T00:06:13Z` can be pasted as-is.

```bash
cd otr-replay
uv run otr-replay --as-of 2026-06-27T23:59
```

The program downloads the correct public replica from the [public replicas site](https://data.otr.stagec.net), verifies its checksum, imports it into a temporary database, runs the correct [[Development/Platform Architecture#processor|processor]] release, reconciles decay, and writes two files: a CSV with the columns `osu_id`, `username`, `ruleset`, `rating`, and `volatility`, and a metadata file describing the run.

The replica is stored in the system's default temp directory and is discarded when the process finishes, even if it fails.

> [!note]
> The first public replica is dated `2025-10-06T21:13:57Z`, and `2025.10.01` is the earliest supported processor release for this process.

Tournament hosts who filter registrants with the [filtering tool](https://otr.stagec.net/tools/filter) are instructed to list the filter report ID on the tournament's forum post, so a report should be available. Use the [filter report lookup tool](https://otr.stagec.net/tools/filter-reports) to search for the report ID and download the CSV file.

If the forum post does not provide a report ID, compare the export against the tournament's publicly available rating data. Ideally, this is supplied in CSV form with at least the `osu_id` and `rating` properties present for each registrant.

> [!note]
> The filter reports web interface rounds ratings to two decimal places for display. The downloaded CSV contains full precision values.

### The metadata file

Every run writes a `.metadata.json` file beside the CSV. It describes the exact inputs the ratings were produced from, along with the [[#Decay Reconciliation|decay reconciliation]] that was applied and a SHA-256 digest of the CSV itself. Keep and share the two files together; the metadata is what makes a CSV traceable back to its inputs.

To confirm that a CSV matches its metadata, compare the file's SHA-256 digest against the recorded one. Two runs are directly comparable through their metadata files alone.

## Decay Reconciliation

The processor applies a final [[Rating Framework/Rating Calculation/Rating Decay|decay]] pass up to the system's current time and is therefore not aware that it is being run against an older dataset. Replaying an old snapshot therefore incorrectly creates decay adjustments that did not exist at that time and must be reconciled.

The `otr-replay` tool automatically corrects this using the following process:

1. It verifies that only decay adjustments exist after the snapshot was created.
1. It deletes those adjustments and restores the exact rating and volatility values recorded without them.
1. It refuses to write any output if anything other than decay follows the snapshot.

This process is required to restore ratings to their state at the time of the snapshot.

### Example

Decay is applied every Wednesday at 12:00 UTC, so reconciliation always restores ratings to the last adjustment that precedes the snapshot.

In this example, the processor release is `2026.05.18`, the database snapshot is for `2026-06-09T11:45:01Z`, the effective date is `2026-06-12T12:00:00Z`, and the system date is `2026-08-08`. Without reconciliation, `im a fancy lad`'s decay is generated through the Wednesday prior to the present day (`2026-08-05T12:00:00Z`), as shown below.

![[fancylad-rating-history-unreconciled.png]]

With reconciliation, however, the final decay update occurs at `2026-06-03T12:00:00Z`, which is the time of the last decay application at the time of the snapshot.

![[fancylad-rating-history-reconciled.png]]

## Manual Verification

The manual procedure below reproduces what `otr-replay` automates. Because the database is imported directly from a replica, no application setup is required; the only prerequisites are [Docker](https://www.docker.com/get-started/) and, on Windows, [Git Bash](https://git-scm.com/downloads) or [WSL](https://learn.microsoft.com/en-us/windows/wsl/install).

> [!warning]
> Read this section carefully to avoid accidentally selecting the wrong replica or processor version.

### Start the database

Create a network and a standalone PostgreSQL container:

```bash
docker network create otr-replay-net
docker run -d --name otr-db --network otr-replay-net \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=postgres \
  postgres:17
```

Before importing, repeat the following command until it reports that the server is accepting connections:

```bash
docker exec otr-db pg_isready -h 127.0.0.1 -U postgres
```

### Import a database replica

Public database replicas are published on the [public replicas site](https://data.otr.stagec.net).

Download the most recent replica available **at or before the *effective date***, along with its `.sha256` checksum file, and verify the download:

```bash
# Note: Both the replica .gz and the
# .sha256 file must be in the same directory
sha256sum -c /path/to/replica.gz.sha256
```

Then import the replica:

```bash
gunzip -c /path/to/replica.gz | docker exec -i otr-db psql -U postgres -d postgres
```

> [!Tip]
> The replica file names use `:`, which Windows may flag as an illegal character. If trouble arises during import, replace `:` with `-` in the replica's file name.

> [!tip]
> `ERROR: role [...] does not exist` messages are expected and can be safely ignored. Any other error means the import failed.

### Run the processor

Processor releases up to `2026.08.16` were published from the [otr-processor repository](https://github.com/osu-tournament-rating/otr-processor/releases); later processor releases are [otr-web releases](https://github.com/osu-tournament-rating/otr-web/releases) that changed the processor. Every supported processor release has a [`stagecodes/otr-processor` image](https://hub.docker.com/r/stagecodes/otr-processor/tags) tagged with its name, so an otr-web release after `2026.08.16` without a matching image is not a processor release. No otr-web release up to `2026.08.16` is a processor release, even when it shares a name with one.

Find the most recent processor release published **at or before the timestamp of the *replica*** imported earlier. The replica's timestamp, not the effective date, is the reference point. The ratings in a replica were produced by whichever release was live when it was taken. `otr-replay` makes this selection automatically.

Docker image tags match release names, so take the name of the release and replace the `YYYY.MM.DD` text below with that value.

```bash
docker run --rm \
  --name otr-processor \
  --network otr-replay-net \
  -e CONNECTION_STRING="postgresql://postgres:password@otr-db:5432/postgres" \
  -e IGNORE_CONSTRAINTS=true \
  -e RABBITMQ_URL="amqp://guest:guest@127.0.0.1:1" \
  stagecodes/otr-processor:YYYY.MM.DD
```

> [!note]
> A placeholder `RABBITMQ_URL` is provided as the processor requires it be set. A warning will appear in the processor that can be safely ignored.
>
> `CONNECTION_STRING` and `RABBITMQ_URL` work with every processor release. Images published from otr-web also accept `DATABASE_URL` and `RABBITMQ_AMQP_URL`.

> [!example]
> If the effective date is `2026-07-01T23:00:00Z`, the newest replica at or before it is `2026-06-30T11:45:01Z`, and the latest processor release published before that replica is `2026.05.18`.

> [!example]
> Releases `2026.08.03` and `2026.08.04` were published at `2026-08-03T23:05:05Z` and `2026-08-04T23:41:47Z`. For an effective date of `2026-08-05T12:00:00Z`, the newest replica at or before it is `2026-08-04T11:45:01Z`, which was taken roughly twelve hours before `2026.08.04` shipped. The correct release is therefore `2026.08.03`, even though `2026.08.04` was already published by the effective date.
>
> ![[processor-release-names.png]]

> [!notice]
> A release is only deployed once its Docker image exists. Usually this happens a few minutes after the GitHub release. This can be verified on [Docker Hub](https://hub.docker.com/r/stagecodes/otr-processor/tags).

> [!tip]
> The releases pages show relative dates such as "3 days ago". Hover over one to reveal its exact publication time in UTC. When a release and the replica share a date, compare those two times directly and skip the release if it came later.

### Reconcile decay

The processor applies decay up to the moment it runs rather than the effective date, so the database now contains decay adjustments that did not exist when the snapshot was created.

Remove them by restoring each affected rating and deleting those adjustments. Replace every `YYYY-MM-DD HH:MM:SS` value with the exact timestamp of the replica you imported, taken from its filename: replace the `T` with a space and the trailing `Z` with `+00`.

>[!example]
> For `otr-public-replica_2026-08-08T00:06:13Z.gz`, use `2026-08-08 00:06:13+00`.

```bash
printf '%s' '
BEGIN;
DO $guard$
BEGIN
  IF EXISTS (
    SELECT FROM rating_adjustments
    WHERE timestamp > $ts$YYYY-MM-DD HH:MM:SS+00$ts$
      AND (adjustment_type NOT IN (1, 3) OR match_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION $msg$adjustments after the snapshot are not decay; cannot reconcile$msg$;
  END IF;
END $guard$;
WITH earliest AS (
    SELECT DISTINCT ON (player_id, ruleset)
        player_id, ruleset, rating_before, volatility_before
    FROM rating_adjustments
    WHERE timestamp > $ts$YYYY-MM-DD HH:MM:SS+00$ts$
      AND adjustment_type IN (1, 3)
    ORDER BY player_id, ruleset, timestamp, id
)
UPDATE player_ratings pr
SET rating = earliest.rating_before,
    volatility = earliest.volatility_before
FROM earliest
WHERE pr.player_id = earliest.player_id
  AND pr.ruleset = earliest.ruleset;
DELETE FROM rating_adjustments
WHERE timestamp > $ts$YYYY-MM-DD HH:MM:SS+00$ts$
  AND adjustment_type IN (1, 3);
COMMIT;
' | docker exec -i otr-db psql -v ON_ERROR_STOP=1 -U postgres -d postgres
```

> [!tip]
> Adjustment types `1` and `3` are rating decay and volatility decay respectively. Decay adjustments dated after the replica was created are a product of the replay and should be removed. The first code block above refuses to reconcile if anything other than decay follows the snapshot.

### Export player ratings

Export player ratings for verification. Rulesets are mapped as follows:

- `0` = osu!
- `1` = osu!taiko
- `2` = osu!catch
- `3` = osu!mania (Other) (No ratings are generated for this ruleset)
- `4` = osu!mania 4K
- `5` = osu!mania 7K

```bash
# Export all player ratings to CSV
docker exec -i otr-db psql -U postgres -d postgres -c "COPY (
    SELECT
        p.osu_id,
        p.username,
        pr.ruleset,
        pr.rating,
        pr.volatility
    FROM public.players p
    JOIN public.player_ratings pr ON p.id = pr.player_id
    ORDER BY pr.ruleset, pr.rating DESC, p.osu_id
) TO STDOUT WITH CSV HEADER;" > ratings.csv
```

A manual run and an `otr-replay` run of the same effective date produce identical file contents; their SHA-256 digests should match.

### Clean up

Remove the temporary container and network (the processor container removes itself):

```bash
docker rm -f otr-db
docker network rm otr-replay-net
```

## Troubleshooting

- **Database connection refused**: Ensure the PostgreSQL container is running with `docker ps` and accepts connections per `pg_isready` above.
- **Processor warns that RabbitMQ is unreachable**: This is expected; a replay runs without messaging.
- **Adjustments after the snapshot are not decay**: The snapshot cannot be reconciled; please [[Contact|contact us]].
- **`otr-replay` fails because a checksum is missing or does not match**: Every replica has a published checksum, and a download is never used unverified. Retry, and [[Contact|contact us]] if it persists.
- **Export produces an empty or corrupted file**: Ensure the export command uses `docker exec -i` without `-t`; a TTY corrupts output that is redirected to a file.
