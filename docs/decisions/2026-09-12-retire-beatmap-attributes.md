# Retire unreleased beatmap attribute processing

Beatmap attribute processing is out of scope while it is reworked. Release
`2026.09.01` is the last full release. This rollback reverses the unreleased
runtime work from PRs #899, #901, and #904.

## Result

Metadata ingestion no longer records calculation intent. The dedicated worker,
CLI, source-file downloads, local/GCP storage adapters, calculation helpers,
queue wiring, deployment profile, and Prometheus target are removed. Normal
osu! metadata fetching, manual overrides, public response fields, ratings, and
verification are unchanged.

Migrations `0031` through `0034`, their snapshots and journal entries, and the
matching table definitions and relations remain intact. They have been deployed;
rewriting them would break migration history. The retained `beatmap_files`,
`beatmap_attribute_jobs`, and `beatmap_attributes` tables are dormant. Their
TypeScript types describe existing rows and provide no calculation functions.
No data or stored source files are deleted. A future redesign must explicitly
migrate or retire these tables and coordinate public replica consumers.

## Deployment and environment cleanup

Remove these variables from deployment environment secrets, local `.env` files,
and any service environment configured specifically for attributes:

- `BEATMAP_ATTRIBUTES_ENABLED`
- `BEATMAP_ATTRIBUTES_STORAGE`
- `BEATMAP_ATTRIBUTES_LOCAL_DIR`
- `BEATMAP_ATTRIBUTES_GCP_BUCKET`
- `BEATMAP_ATTRIBUTES_GCP_CREDENTIALS`
- `BEATMAP_ATTRIBUTES_CONCURRENCY`
- `BEATMAP_ATTRIBUTES_DISCOVER` if retained from an older example.

Remove `BEATMAP_ATTRIBUTES_TEST_DATABASE_URL`,
`BEATMAP_ATTRIBUTES_TEST_GCS_ENDPOINT` from local test configuration if present.
Remove `GOOGLE_APPLICATION_CREDENTIALS` only if it was set solely for this
pipeline; it is a shared Google Cloud convention and may serve other tools.

Before manually replacing a stack, stop its old `beatmap-attributes-worker`
service using the old Compose file. Remove any standalone process, systemd unit,
or scheduled command that invokes `attributes:worker` or `attributes`. Remove
`beatmap-attributes` from externally configured `COMPOSE_PROFILES` or CLI profile
arguments. The standard deployment runs `up -d --remove-orphans`, which removes
the old service container after the updated Compose file is installed.

Restart or reload Prometheus to apply the removed scrape target. Keep the shared
`METRICS_PORT`, database, RabbitMQ, and tracing variables required by other
services. Attribute-only service definitions and their overrides can be removed.

The `beatmap-files` Docker volume, local source directory, GCP objects, retained
database rows, and durable `processing.attributes.beatmaps` queue are not purged.
Queued work will remain unprocessed after the old consumer stops. Storage and
queue deletion require a separate retention decision.

## Issue and changelog reconciliation

PRs #899, #901, and #904 have no linked closing issues. Issues #744 and #752 are
already open. Issue #751 was separately closed as not planned before these PRs
merged, so it does not qualify for reopening. Older attribute issue closures
predate the release boundary.

The prepared `changelog/otr-web-899` branch must remove its unreleased attribute
announcement. No release changelog entry is needed for withdrawing this
unreleased capability.
