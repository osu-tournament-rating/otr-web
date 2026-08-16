# otr-web agent guidance

Run commands from the repository root unless noted.

- `packages/otr-core/` is the shared contract layer: Drizzle schema, relations,
  domain enums, queue names and messages, logging, maintenance windows. Never
  duplicate a shared contract inside an app workspace.
- Do not invoke anything under `scripts/` or `monitoring/`.

## Commands

- `bun run dev` serves the web app on :3000. Playwright owns :3001.
- `bun test` runs the Bun tests across all workspaces.
- E2E specs are `apps/web/e2e/*.e2e.ts` and need the configured database,
  RabbitMQ, and auth fixtures. Write or run them only when instructed.
- Avoid `bun run build` and the full E2E suite — both build, and both are slow.
  Fast iteration outweighs exhaustive checks on small changes.
- Prefer running the site and screenshotting it to check your own work before
  reporting a finished result.

## Typography

- Use the UI sans font (`--font-sans`, Inter) for all user-facing text, including
  labels, captions, chart axes, chart tooltips, table headers, and numbers.
- Sentence case for labels and captions. No `uppercase`, and no `tracking-wide`
  to compensate for it.
- `text-xs` (12px) is the minimum. Update manual overrides to adhere if encountered.

## Database and migrations

- `packages/otr-core/src/db/schema.ts` is the model source of truth. Generate
  with `bunx drizzle-kit generate` from the root and read the emitted SQL.
- Migrations and metadata present in the latest release tag are immutable: never
  rewrite, rename, reorder, or delete released SQL, snapshots, or journal
  entries.
- Commit the schema change, generated SQL, snapshot, and journal update together.
- Apply migrations only to a disposable local database. Start one with
  `docker compose up -d db` if nothing is running at `localhost:5432`.
- If a non-o!TR database is running at `localhost:5432`, make no writes and apply
  no migrations. Report it as a blocking issue.
- Physical SQL names and persisted numeric enums are contracts with
  `otr-processor`. TypeScript cannot validate those consumers.
