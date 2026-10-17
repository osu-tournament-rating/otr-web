# otr-processor agent guidance

The processor lives in otr at `apps/processor`. It is not a bun workspace:
run its commands from this directory, unlike the rest of otr. Stable Rust is
pinned in `rust-toolchain.toml` to match `rust-version` in `Cargo.toml`.
`cargo +nightly fmt` is the one nightly command because `rustfmt.toml` uses
unstable options.

This app owns rating calculation and full-rebuild SQL. The rest of otr owns
the schema and migrations. Treat the boundary as a contract. Start task
configuration from the root `.env.example`; never copy credentials, commit
`.env`, or log a credentialed PostgreSQL or RabbitMQ URL.

`dotenvy` looks for `.env` in the working directory, then in each parent, and
loads the first one it finds without overriding variables already set. A run
from `apps/processor` therefore reads otr's root `.env`, whose
`DATABASE_URL` is the local development database. A `.env` in this directory
would shadow the root one.

Running the binary changes its target database. Never use production or a
shared database for verification. Use the assigned disposable database on port
`5434` for manual runs, and set `DATABASE_URL` for the run so the root `.env`
cannot pick the target. Existing isolated Testcontainers tests can use their
assigned dynamic ports.

## Commands

- `cargo run -- --help` lists options. A run needs `DATABASE_URL`, or
  `CONNECTION_STRING`, which the production cron still passes. RabbitMQ reads
  `RABBITMQ_AMQP_URL`, then `RABBITMQ_URL`.
- `cargo test` runs unit tests. Database tests use Testcontainers and Docker,
  and build each database from otr's drizzle migrations.
  The real-broker tests are ignored by default. Run them with
  `OTR_TEST_RABBITMQ_URL=<url> cargo test -- --ignored`, where `<url>` is the
  stack's `RABBITMQ_AMQP_URL` after `apps/scripts/otr up rabbitmq --no-web`.
  They fail when the variable is unset and never fall back to a default broker.
  Never point it at the developer's broker on port 5672.
  A test that spawns the binary sets `DATABASE_URL` and any broker URL itself;
  otherwise the root `.env` supplies them.
- Before handoff: `cargo +nightly fmt -- --check`, `cargo clippy`, `cargo test`,
  and `git diff --check`. Report unavailable infrastructure as blocked.
- CI runs fmt, clippy with `-D warnings`, and tests only when a change touches
  `apps/processor/**`, `apps/web/drizzle/**`, `packages/otr-core/src/db/**`,
  or `packages/otr-core/src/osu/enums.ts`, and builds the image on such a
  pull request.
- A release pushes `stagecodes/otr-processor:<release tag>` only when this
  directory changed since the previous release; release notes name the image
  each release runs. Production's cron runs `latest` weekly, Tuesdays 12:00 UTC.

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
  reorder or renumber them. `tests/contracts/` checks them, and the verified
  status the SQL filters on, against `@otr/core`.
- Changes to match weights, initial bounds, decay, volatility, or floors need
  focused unit tests and full-rating tests with expected impact.
- Skip a verified game with fewer than two verified scores and retain its
  data-integrity warning.
- Keep overall ranking, country ranking, percentile, rating history, and highest
  rank consistent for every ruleset.
- Use deterministic fixtures with explicit times and placements. Give float
  assertions a meaningful tolerance.

## Database and messaging contracts

- `src/database/` consumes the otr schema at
  `packages/otr-core/src/db/schema.ts`; migrations live in `apps/web/drizzle/`.
  Both paths are from the otr root.
  Update row structs, raw SQL, and `COPY` columns for an affected contract.
  The database tests run against a schema built from those migrations, so
  update their seed data when a column they insert changes. Use additive
  migrations.
- Keep recomputation writes on one connection inside the transaction guard.
  Preserve rollback around truncation, `COPY`, score updates, and stale-stat
  deletion.
- The stats exchange, queue, routing key, AMQP properties, and camel-case
  `ProcessTournamentStatsMessage` JSON are worker contracts.
- Publishing can fail independently and occurs before database commit. Preserve
  publish-failure logs and the current behavior that does not abort the rebuild.
  Do not assume exactly-once delivery or committed data at publication time.
