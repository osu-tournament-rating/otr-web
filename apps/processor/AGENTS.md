# otr-processor agent guidance

Run commands from the repository root with stable Rust (`rust-version` in
`Cargo.toml`). `cargo +nightly fmt` is the one nightly command because
`rustfmt.toml` uses unstable options.

This repository owns rating calculation and full-rebuild SQL. `otr-web` owns the
schema and migrations. Treat the boundary as a contract. Start task
configuration from `.env.example`; never copy credentials, commit `.env`, or log
a credentialed PostgreSQL or RabbitMQ URL.

Running the binary changes its target database. Never use production or a
shared database for verification. `--ignore-constraints` is not a dry run. Use
the assigned disposable database on port `5434` for manual runs. Existing
isolated Testcontainers tests can use their assigned dynamic ports.

## Commands

- `cargo run -- --help` lists options; `CONNECTION_STRING` is required to run.
- `cargo test` runs unit tests. Database tests use Testcontainers and Docker.
  Real-broker tests are ignored unless an approved disposable broker is assigned.
- Before handoff: `cargo +nightly fmt -- --check`, `cargo clippy`, `cargo test`,
  and `git diff --check`. Report unavailable infrastructure as blocked.

## Ownership

`src/main.rs` orchestrates one recomputation transaction. Keep math in
`src/model/`, persistence in `src/database/`, RabbitMQ behavior in
`src/messaging/`, CLI or environment parsing in `src/args.rs`, and shared helpers
in `src/utils/`. Use structured `tracing` fields for diagnostics.

Centralize rating constants in their existing domain modules. A constant change
can rewrite all history; pair it with explicit impact analysis and deterministic
tests.

## Rating invariants

- Preserve chronological match order, match-end fallback, decay boundaries,
  ranking ties, participation behavior, and rating floor semantics.
- Persisted `Ruleset` is `0..=5`; `RatingAdjustmentType` is `0..=3`. Never
  reorder or renumber them.
- Changes to match weights, initial bounds, decay, volatility, or floors need
  focused unit tests and full-rating tests with expected impact.
- Skip a verified game with fewer than two verified scores and retain its
  data-integrity warning.
- Keep overall ranking, country ranking, percentile, rating history, and highest
  rank consistent for every ruleset.
- Use deterministic fixtures with explicit times and placements. Give float
  assertions a meaningful tolerance.

## Database and messaging contracts

- `src/database/db.rs` consumes the sibling `otr-web` schema at
  `packages/otr-core/src/db/schema.ts`; migrations live in `apps/web/drizzle/`.
  Update row structs, raw SQL, `COPY` columns, and `tests/database/schema.sql`
  for an affected contract. Use additive migrations and test a fresh disposable
  database.
- Keep recomputation writes on one connection inside the transaction guard.
  Preserve rollback around truncation, `COPY`, score updates, and stale-stat
  deletion.
- The stats exchange, queue, routing key, AMQP properties, and camel-case
  `ProcessTournamentStatsMessage` JSON are worker contracts.
- Publishing can fail independently and occurs before database commit. Preserve
  publish-failure logs and the current behavior that does not abort the rebuild.
  Do not assume exactly-once delivery or committed data at publication time.
