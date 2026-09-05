# otr-web agent guidance

Run commands from the repository root. First read
`/home/stage/code/git/otr/AGENTS.md` and
`/home/stage/code/git/otr/.agents/WORKFLOW.md`.

- `packages/otr-core/` owns shared schema, relations, domain enums, queue names
  and messages, logging, and maintenance windows. Do not duplicate a contract in
  an app.
- Read `.agents/skills/otr-design-system/SKILL.md` and
  `.agents/design/README.md` before designing, building, or reviewing rendered
  UI.
- Read `.agents/skills/change-otr-contracts/SKILL.md` before changing a schema,
  migration, queue, message, persisted enum, oRPC/OpenAPI shape, or auth boundary.
- Read `apps/discord-bot/AGENTS.md` before bot work.
- Do not invoke anything under `scripts/` or `monitoring/` during ordinary
  development.

## Commands

- `bun test` runs Bun tests across workspaces.
- `bun run lint` runs the repository lint task.
- `bunx tsc --noEmit -p <workspace>/tsconfig.json` checks an affected workspace.
- `bunx prettier <changed-files> --check` checks formatting.
- `git diff --check` checks whitespace.
- From `apps/web`, `bun run dev --port <owned-port>` starts a task-owned local
  site. Do not reuse another worktree's process.
- Playwright owns port `3001` and builds before it starts. Do not let
  `reuseExistingServer` attach to an unrelated server. Write and run UI E2E only
  at the shared workflow's clean-review gate.
- Run a full build or full E2E suite only when its coverage is needed. Report an
  unavailable dependency as blocked.

In a worktree, commit with `git -c core.hooksPath=.husky commit` so repository
hooks run against that worktree.

## UI

- Use Inter through `--font-sans` for all visible text and numbers.
- Use sentence case. The minimum visible text size is `text-xs`.
- Use semantic tokens for chrome and text. Use domain palettes from
  `apps/web/app/globals.css` for mods, grades, rank ranges, teams, statuses, and
  charts. Do not invent a chart or table palette for an existing meaning.
- Base status tokens (`success`, `warning`, `destructive`) are vivid fills,
  borders, and icons. Use the matching `*-foreground` for readable status text.
  Use `text-primary-foreground` only on `bg-primary`.
- Measure text contrast on solid status fills. `bg-success` uses
  `text-green-950`; white and `green-800` do not meet its measured target.
- Reuse shadcn and Radix primitives, Lucide icons, `cn`, and existing utilities.
  Compose `components/ui/*`; do not edit a primitive for one call site.
- Do not override the `z-50` layer on portalled shadcn overlay content. Wrap a
  tooltip around `DialogTrigger`, not `Dialog`.
- Use an existing Tailwind utility when it expresses the value. Use an arbitrary
  value only for a real design-specific dimension.
- Apply a site-wide change only when the user requested site-wide scope. Check
  every affected instance and overlay within that scope.

## Database and migrations

- `packages/otr-core/src/db/schema.ts` is the model source of truth. Generate
  with `bunx drizzle-kit generate` only after the lead records migration
  ownership. Inspect generated SQL and metadata.
- Never connect to port `5432`. Apply and verify migrations on a disposable
  database from `otr-scripts` on port `5434`.
- Migration SQL, snapshots, and journal entries already released or deployed
  are immutable. Commit schema, generated SQL, snapshot, and journal change
  together.
- Physical SQL names and persisted numeric enums are contracts with
  `otr-processor`; TypeScript checks cannot validate them.

## Data and API

- Admin editors accept database-valid input. Explain fields with hints. CS, AR,
  HP, and OD are the exception: enforce `0` through `10` on client and server,
  show no range hint, and use `10` as the empty placeholder.
- Prefill stored admin values. Apply a bound change to the form and oRPC schema
  together.
- Store osu! API values as fetched. Keep automatic adjustments and admin
  overrides in separate columns.
- Do not delete an oRPC procedure, route, or response field because the site has
  no caller. Public API and audit history can consume it.
- Derive oRPC output schemas from shared Zod schemas with `pick`, `omit`, and
  `extend`; do not list columns by hand.
- Audit triggers cover insert, update, and delete, diff every column except
  `id`, `updated`, and `search_vector`, and skip empty diffs. Only admin-session
  writes carry `action_user_id`; worker writes are system changes. Never narrow
  a trigger. Disable the table trigger around a data migration that rewrites
  rows.
- On verified data, an empty statistics state says processing is still in
  progress. Call data unverified only when it is unverified.

## Tracing

`@otr/core/tracing` owns OTLP setup. Procedure spans contain Drizzle statement
spans, queue messages carry trace context, and logs carry `traceId`. Never put
query parameters, user input, or secrets on a span.
