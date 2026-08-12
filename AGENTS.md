# otr-web agent guidance

Applies to the whole repository. Run commands from the repository root unless noted.

## Layout

- `apps/web/` — Next.js App Router site, oRPC server and client, Better Auth, UI components.
- `apps/data-worker/` — Bun workers for queue consumption, osu! and osu!track ingestion, automation checks, statistics, refetching.
- `packages/otr-core/` — shared contract layer: Drizzle schema, relations, domain enums, messages, queues, logging, maintenance windows.
- `apps/web/drizzle/` — ordered SQL migrations and Drizzle metadata generated from the shared schema.
- `scripts/` and `monitoring/` — local, migration, E2E, and observability helpers. Do not invoke these.

Bun tests live in `__tests__/*.test.ts` beside the implementation; Playwright specs live in `apps/web/e2e/*.e2e.ts`.

Import web-local code with `@/`, shared code with `@otr/core` or `@otr/core/*`. Never duplicate a shared contract inside an app workspace.

## Skills

- `.agents/skills/change-otr-contracts/SKILL.md` — before changing physical database identifiers, Drizzle schema or migrations, persisted enums, queue names or messages, verification or rating semantics, public oRPC/OpenAPI contracts, or API-key behavior.
- `.agents/skills/build-and-verify-otr-ui/SKILL.md` — before changing browser-visible routes, pages, components, styles, frontend data flow, responsive behavior, themes, or visual tests.

## Commands

```bash
bun install --frozen-lockfile
bun run dev                    # Web app on :3000 - most commonly used
bun run dev:worker             # Data worker only
bun run dev:all                # Both
bun test                       # Bun tests across the workspaces
bun run lint
bunx tsc --noEmit
bunx prettier . --check        # bun run format to rewrite
bun run build

cd apps/web && bun run test:e2e [-- player-profile.e2e.ts]   # Playwright owns :3001
```

The E2E suite needs its configured database, RabbitMQ, and auth fixtures.

## Typography

- Use the UI sans font (`--font-sans`, Inter) for all user-facing text, including
  labels, captions, chart axes, chart tooltips, table headers, and numbers.
- Write labels and captions in sentence case. Do not use `uppercase`, and do not
  pair it with `tracking-wide` to compensate.
- Keep text at `text-xs` (12px) or larger; `text-[11px]` is the floor and only for
  dense chart axis ticks and footnotes.

## Database and migrations

- `packages/otr-core/src/db/schema.ts` is the model source of truth. Generate with `bunx drizzle-kit generate` from the root and read the emitted SQL.
- Migrations and metadata present in the latest release tag are immutable: never rewrite, rename, reorder, or delete released SQL, snapshots, or journal entries.
- Commit the schema change, generated SQL, snapshot, and journal update together.
- Apply migrations only to a disposable local database. Start one with `docker compose up -d db` if one is not running at `localhost:5432`
- Physical SQL names and persisted numeric enums are contracts with `otr-processor`. TypeScript cannot validate those consumers.

## Verification

Run the narrowest relevant test first, then lint, TypeScript, and Prettier. `bun run build` takes too much time, so avoid running this. Avoid running the full end-to-end test suite as it creates a build. Report the commands actually run and anything skipped. Create end-to-end tests and run them only when instructed. Running the website and taking screenshots with playwright or other tooling is preferred as a way to check your own work before reporting a finished result.

## Safety

- Do not edit generated output: `node_modules/`, `.next/`, `dist/`, coverage, Playwright reports/results, `*.tsbuildinfo`.
- Do not commit, push, or open pull requests without explicit instructions.
- If a non-o!TR database is running at `localhost:5432`, do not make any writes or apply migrations. Report this as a blocking issue.
- Avoid time-consuming commands and processes for simple changes, fast iteration is a primary objective.
