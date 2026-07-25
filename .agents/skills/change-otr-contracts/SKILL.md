---
name: change-otr-contracts
description: Safely change OTR contracts across the physical PostgreSQL schema and migrations, RabbitMQ queues and messages, verification or rating semantics, and oRPC, OpenAPI, or authentication boundaries. Use when a change can affect otr-web, its data worker, otr-processor, operational scripts, or public API consumers.
---

# Change OTR Contracts

Protect compatibility across OTR services. Do not use this skill for a local refactor that leaves stored data, messages, eligibility rules, and external interfaces unchanged.

## Start With The Contract

Read [references/contracts.md](references/contracts.md), then verify every relevant claim against the current source. The reference is an index, not a substitute for tracing the code.

Before editing, write a compatibility matrix:

| Surface | Source of truth | Writers/producers | Readers/consumers | Current contract | Proposed contract | Compatibility | Rollout | Tests |
| ------- | --------------- | ----------------- | ----------------- | ---------------- | ----------------- | ------------- | ------- | ----- |

Include every affected repository and external consumer. Distinguish a TypeScript property rename from a physical SQL rename, and a handler change from a public wire change. If a consumer cannot be identified, stop and resolve that gap before changing the contract.

## Choose The Rollout

Prefer one compatible deployment when the old and new code can coexist. Otherwise use an expand-migrate-contract sequence:

1. **Expand:** add the new field, value, queue, or response shape while preserving the old one.
2. **Migrate:** backfill stored data; deploy readers that accept both forms; then switch or dual-write producers.
3. **Contract:** remove the old form only after all consumers are deployed, queued old messages are drained, and rollback no longer needs it.

For a required message field, deploy a consumer that accepts old and new envelopes before the producer emits the field. For a queue rename, consume both names before dual-publishing, drain the old queue, then remove it. For a physical column rename or type change, introduce a new column and backfill it instead of relying on an in-place breaking migration.

## Preserve Each Boundary

### Database and migrations

- The schema source is `packages/otr-core/src/db/schema.ts`; relations and all raw SQL consumers are part of the same review.
- Treat physical table/column names, SQL types, nullability, defaults, constraints, indexes, triggers, and stored numeric values as contracts. A Drizzle property-only rename that preserves its explicit SQL name does not change the Rust processor contract.
- Generate migrations with `bunx drizzle-kit generate`. Never hand-create a generated migration or rewrite a migration contained in a released/deployed revision. Use `git describe --tags --abbrev=0` and deployment records to identify immutable history.
- Inspect both the generated SQL and metadata. Reject destructive statements unless the compatibility matrix includes a staged rollout, backfill, rollback, and explicit data-retention decision.
- Never migrate, restore, truncate, or seed the user's existing database for validation. Apply migrations only to an explicitly disposable database. Test both an empty database and a disposable copy at the pre-change schema version when the upgrade path matters.
- Account for processor lifecycle behavior: `player_ratings` and `rating_adjustments` are rebuilt as a unit, while highest ranks and worker-generated statistics have different retention rules.

### Queues and messages

- Change queue names in `packages/otr-core/src/queues/constants.ts` and message shapes in `packages/otr-core/src/messages/types.ts`, then update every producer and consumer together.
- Preserve the flattened JSON envelope: `requestedAt`, `correlationId`, and `priority` are top-level fields alongside the payload. Do not wrap it in `{ metadata, payload }` without a staged cross-service migration.
- Preserve durable queues, supported priorities `0`, `5`, and `10`, persistent delivery, acknowledgement behavior, and the special processor-to-worker stats topology described in the reference.
- Add optional fields with defaults when possible. Never publish an incompatible envelope before all live consumers can parse it.
- Test malformed input, old and new envelope forms during a transition, retry/requeue behavior, and idempotency or duplicate delivery where writes occur.

### Verification and ratings

- Stored enum ordinals and rejection/warning bit flags are append-only contracts. New flags use an unused power of two; never renumber existing values.
- `Verified = 4` is hard-coded in Rust SQL and gates ratings at tournament, match, game, and score levels. Any eligibility change requires coordinated web, data-worker, and processor updates.
- Preserve manual final decisions unless the feature explicitly changes override semantics. Verification and rejection cascades have different behavior; test descendants and bitwise reasons, not only the parent status.
- Rating math belongs in `otr-processor`. Web code exposes results and computes derived tournament/match statistics; it must not independently recreate the rating model.
- Treat `Initial`, `Decay`, `Match`, and `VolatilityDecay` differently. Only `Match` adjustments represent performance, and only those carry a match ID.

### oRPC, OpenAPI, and authentication

- Define input/output schemas, procedure behavior, and router wiring as one contract. Prefer additive optional response fields; stage removals or meaning changes.
- A `publicProcedure` is session-optional on `/rpc`. It reaches `/api` only when its route is tagged `public`, and the `/api` transport still requires an API key. Do not infer exposure or authentication from the builder name alone.
- Keep public output schemas explicit. Review generated OpenAPI when changing routes, tags, coercion, enums, shared schemas, status codes, or auth headers.
- `protectedProcedure` requires a Better Auth session. `adminMutationProcedure` adds the maintenance guard, but handlers must still call `ensureAdminSession`; audited admin writes must retain `withAuditUserId`.
- Do not expose internal IDs, auth records, API-key material, audit-only data, or unverified data merely because it exists in a Drizzle-derived schema.

## Run Conditional Checks

Run the smallest relevant set while iterating, then all applicable checks before completion. Report commands that could not run and why.

Always for touched TypeScript:

```bash
bun run lint
bunx tsc --noEmit -p packages/otr-core/tsconfig.json
git diff --check
```

Add `bunx tsc --noEmit -p apps/web/tsconfig.json` for web, API, or auth changes and `bunx tsc --noEmit -p apps/data-worker/tsconfig.json` for worker or queue changes.

For schema or migrations:

```bash
bunx drizzle-kit generate
bunx drizzle-kit check
DATABASE_URL=<disposable-empty-postgres-url> bunx drizzle-kit migrate
```

Also migrate a disposable database at the pre-change schema version for non-additive, backfill, constraint, or default changes. Inspect `git diff -- packages/otr-core/src/db/schema.ts apps/web/drizzle` before applying anything.

For automation, verification, or stats:

```bash
bun test apps/data-worker/src/automation-checks
bun test apps/data-worker/src/stats
bun test apps/web/app/server/oRPC/procedures/tournaments/__tests__ apps/web/app/server/oRPC/procedures/matches/__tests__
```

For public API or auth, run focused procedure tests and:

```bash
bun run --filter web build
```

Inspect `/api/openapi.json` from the built application and exercise both `/rpc` session behavior and `/api` API-key behavior for changed routes.

For any processor-visible database, enum, eligibility, rating, or stats-message change, run in the sibling `otr-processor` repository:

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

Finish with a compatibility matrix updated to the implemented state, the actual deployment order, backfill/rollback notes, and evidence for every affected producer and consumer.
