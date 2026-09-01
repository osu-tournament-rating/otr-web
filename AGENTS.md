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
- Do not run the site or screenshot it to check your own work; the web
  designer and tester verify the preview deployment.

## Tracing

- Spans go to Alloy over OTLP, then to Tempo; read them in Grafana under
  Drilldown > Traces. Nothing is exported unless
  `OTEL_EXPORTER_OTLP_ENDPOINT` is set, so local runs and tests stay quiet.
- `@otr/core/tracing` owns the setup. A procedure span wraps every oRPC call and
  each statement drizzle issues becomes a child span, so a slow query is visible
  under the procedure that ran it. Queue messages carry the trace across to the
  data worker.
- Logs carry `traceId`, which is how Grafana links a log line to its trace.
  Never put query parameters or user input on a span.

## Typography

- Use the UI sans font (`--font-sans`, Inter) for all user-facing text, including
  labels, captions, chart axes, chart tooltips, table headers, and numbers.
- Sentence case for labels and captions. No `uppercase`, and no `tracking-wide`
  to compensate for it.
- `text-xs` (12px) is the minimum. Update manual overrides to adhere if encountered.

## Tailwind

- Use semantic color tokens for text, never palette colors like
  `text-neutral-200` or `text-orange-500`.
- The base status token (`success`, `warning`, `destructive`) is the vivid role:
  fills, chip tints, borders, and icons. It clears the 3:1 graphics bar, not the
  4.5:1 text bar.
- The matching `*-foreground` token is the readable text role in both themes,
  for a label on a tinted chip and for colored body text alike.
  `text-primary-foreground` only goes on `bg-primary`. `text-muted-foreground`
  is the muted text token and is fine anywhere.
- Measure the label on a solid status fill rather than assuming it. `bg-success`
  takes `text-green-950`, the one measured exception to the rule above: white is
  3.22 and `green-800` is 2.21 on `green-600`.
- Never set a `z-*` class on shadcn overlay content (`PopoverContent`,
  `DropdownMenuContent`, `TooltipContent`). They are portalled at `z-50`, and
  `cn` is `twMerge` (`apps/web/lib/utils.ts`), so a call-site `z-1` overrides
  the primitive.
- Wrap the tooltip around `DialogTrigger`, never around `Dialog`.

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
