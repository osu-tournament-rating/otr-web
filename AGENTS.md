# otr-web agent guidance

Run commands from the repository root unless noted.

- `packages/otr-core/` is the shared contract layer: Drizzle schema, relations,
  domain enums, queue names and messages, logging, maintenance windows. Never
  duplicate a shared contract inside an app workspace.
- Do not invoke anything under `scripts/` or `monitoring/`.
- Before you design, build, or review rendered UI, read
  `.agents/skills/otr-design-system/SKILL.md`. Before you change a schema,
  queue message, enum, or API shape, read
  `.agents/skills/change-otr-contracts/SKILL.md`.

## Commands

- `bun run dev` serves the web app on :3000. Playwright owns :3001.
- `bun test` runs the Bun tests across all workspaces.
- E2E specs are `apps/web/e2e/*.e2e.ts` and need the configured database,
  RabbitMQ, and auth fixtures. Write or run them only when instructed.
- Do not run `bun run build` or the full E2E suite for a small change; both
  build and both are slow.
- Do not run the site or screenshot it to check your own work; the web
  designer and tester verify the preview deployment. The web designer runs
  the site in prototype mode only, against a disposable database on port
  `5434`.

## Pull requests

- Add the `preview` label; the preview deploys on every push, drafts
  included. Comment `!deploy` to redeploy a stale or failed preview.
- In a worktree, commit with `git -c core.hooksPath=.husky commit` so the
  pre-commit hook runs against the worktree.
- Only one open pull request adds a migration. Check the open pull requests
  before you run `drizzle-kit generate`.

## Tracing

- Spans go to Alloy over OTLP, then to Tempo; read them in Grafana under
  Drilldown > Traces. Nothing is exported unless
  `OTEL_EXPORTER_OTLP_ENDPOINT` is set, so local runs and tests stay quiet.
- `@otr/core/tracing` owns the setup. A procedure span wraps every oRPC call
  and each statement drizzle issues becomes a child span, so a slow query is
  visible under the procedure that ran it. Queue messages carry the trace
  across to the data worker.
- Logs carry `traceId`, which is how Grafana links a log line to its trace.
  Never put query parameters or user input on a span.

## Typography

- Use the UI sans font (`--font-sans`, Inter) for all user-facing text,
  including labels, captions, chart axes, chart tooltips, table headers, and
  numbers.
- Sentence case for labels and captions. No `uppercase`, and no
  `tracking-wide` to compensate for it.
- `text-xs` (12px) is the minimum size. Raise a smaller override when you
  touch it.

## Tailwind

- Use semantic color tokens for chrome and text, never palette colors like
  `text-neutral-200` or `text-orange-500`. Data encodings use the domain
  palettes in `apps/web/app/globals.css` (`--mod-*`, `--grade-*`,
  `--rank-range-*`, `--team-*`, `--color-status-*`, `--chart-*`) by inline `style`
  or the matching utility.
- The base status token (`success`, `warning`, `destructive`) is the vivid
  role: fills, chip tints, borders, and icons. It clears the 3:1 graphics
  bar, not the 4.5:1 text bar.
- The matching `*-foreground` token is the readable text role in both
  themes, for a label on a tinted chip and for colored body text alike.
  `text-primary-foreground` only goes on `bg-primary`. `text-muted-foreground`
  is the muted text token and is fine anywhere.
- Measure the label on a solid status fill; do not assume it. `bg-success`
  takes `text-green-950`, the one measured exception to the rule above: white
  is 3.22 and `green-800` is 2.21 on `green-600`.
- Never set a `z-*` class on shadcn overlay content (`PopoverContent`,
  `DropdownMenuContent`, `TooltipContent`). They are portalled at `z-50`, and
  `cn` is `twMerge` (`apps/web/lib/utils.ts`), so a call-site `z-1` overrides
  the primitive.
- Wrap the tooltip around `DialogTrigger`, never around `Dialog`.
- Use the utility, not the arbitrary value, when a utility exists:
  `col-span-full` not `col-[1/-1]`, `w-full` not `w-[100%]`, `gap-2` not
  `gap-[0.5rem]`, `text-xs` not `text-[12px]`. An arbitrary value with no
  utility equivalent (a chart height, an aspect ratio, a grid template,
  `ring-[3px]`) is correct.
- No hand-rolled `shadow-[...]`, `oklch(...)`, `var(--...)`, or
  `transition-[a,b]` when `ring-2 ring-offset-2`, `shadow-sm`, or
  `transition` does the job. No `dark:` override that the tokens already
  handle; a distinct dark surface such as `dark:bg-muted/75` on a card stays.
- No single-use extracted class constants (`const THUMB_CLASS = '...'`).
- Never edit the shadcn `components/ui/*` primitives. Compose them, and
  restyle at the call site for state, size, and surface.

## Database and migrations

- `packages/otr-core/src/db/schema.ts` is the model source of truth.
  Generate with `bunx drizzle-kit generate` from the root and read the
  emitted SQL.
- Migrations and metadata present in the latest release tag are immutable:
  never rewrite, rename, reorder, or delete released SQL, snapshots, or
  journal entries.
- Commit the schema change, generated SQL, snapshot, and journal update
  together.
- Never connect to `localhost:5432`; it is a developer's database. Apply
  migrations only to a disposable database from `otr-scripts` (`template-db`,
  port `5434`) or an empty local Postgres on another port.
- Physical SQL names and persisted numeric enums are contracts with
  `otr-processor`. TypeScript cannot validate those consumers.

## Data and API

- Apply a site-wide UI change to every page and table that shares the
  pattern. Check that popovers, filters, and dropdowns still layer above it.
- Admin data editors accept what the database accepts; explain a field with
  a hint, do not block input. Exception: CS, AR, HP, and OD are always in
  `0`-`10`; reject other values on the client and the server, show no range
  hint, and show a placeholder of `10` in an empty field.
- An admin editor prefills the stored value. A bound change lands on the
  form and the oRPC schema in the same pull request.
- Store osu! API values as fetched. Automatic adjustments and admin
  overrides live in their own columns and never overwrite the raw value.
- Never delete an oRPC procedure, route, or response field because the site
  has no caller; the public API and the audit timeline read them.
- Derive oRPC output schemas from the shared Zod schemas with `pick`,
  `omit`, and `extend`. Never list columns by hand.
- Audit triggers fire on every insert, update, and delete, diff every column
  but `id`, `updated`, and `search_vector`, and write nothing when nothing
  changed. Only admin-session writes carry `action_user_id`; worker writes
  are system changes. Never narrow a trigger. A data migration that rewrites
  rows disables the table's trigger around its `UPDATE`.
- An empty stats state on verified data says stats are still in progress
  and to check back later. Only unverified data is called unverified.
