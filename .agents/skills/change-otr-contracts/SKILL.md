---
name: change-otr-contracts
description: Plan and verify compatible o!TR schema, queue, persisted enum, rating, verification, oRPC, OpenAPI, and authentication changes.
---

# Change o!TR contracts

Read `references/contracts.md`, then verify each relevant claim in current
source. Build a compatibility matrix for the affected source of truth, writers,
readers, stored or wire shape, rollout, and tests. Include external consumers and
every affected repository. Stop when a consumer cannot be identified.

Prefer one compatible deployment. Otherwise use expand, migrate, and contract:
deploy readers that accept both forms, migrate or dual-write, then remove the old
form only after queues drain and rollback no longer needs it.

## Preserve contracts

- Treat SQL names, types, nullability, defaults, constraints, indexes, triggers,
  and stored numeric values as contracts. `otr-web` owns schema and migrations;
  update `otr-processor` raw SQL and fixtures when affected.
- Treat queue names, routing, priority, delivery properties, flattened envelopes,
  acknowledgements, retries, and idempotency as contracts. Do not assume
  exactly-once delivery or an atomic database commit and publish.
- Keep stored enum ordinals and bit flags append-only. Preserve final human
  verification and rejection unless the user explicitly changes that policy.
- Keep rating math in `otr-processor`. A rating constant or eligibility change
  needs impact analysis, deterministic tests, and coordinated rollout.
- Keep oRPC schemas, handlers, router wiring, OpenAPI exposure, and authentication
  behavior aligned. Do not expose private records, credentials, audit-only data,
  or unverified data through a derived schema.

## Migrations

Follow the shared workflow's migration lease and open-pull-request discovery
before running `bunx drizzle-kit generate`. Never hand-create generated output,
rewrite released or deployed migration history, or use the generator as a verification
command. Inspect generated SQL, snapshots, journal changes, and the schema diff.
Apply migrations only to assigned disposable databases on port `5434`; test an
empty database and a pre-change copy when upgrade behavior matters.

Use `bunx drizzle-kit check` for a read-only migration consistency check. Run
focused type checks and tests for every affected producer and consumer. Run the
processor format, lint, and tests for processor-visible changes. Finish with the
implemented compatibility matrix, actual rollout order, rollback or backfill,
and evidence for each boundary.
