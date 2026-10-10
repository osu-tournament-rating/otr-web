# otr-web agent guidance

Run commands from the repository root unless noted.

- `packages/otr-core/` is the shared contract layer: Drizzle schema, relations,
  domain enums, queue names and messages, logging, maintenance windows. Never
  duplicate a shared contract inside an app workspace.
- `apps/processor/` is the Rust rating processor, not a bun workspace. Run cargo
  from that directory; its `AGENTS.md` has the processor guidance.
- `apps/docs/` is the docs site at docs.otr.stagec.net: Markdown rendered by
  Quartz from the `apps/docs/quartz` submodule. It is not a bun workspace; its
  `AGENTS.md` has the docs guidance.
- `apps/scripts/` holds the Python operations scripts: database archives and
  recovery, the weekly processor run, and disposable template databases. It is
  not a bun workspace. Run uv from that directory; its `AGENTS.md` has the
  scripts guidance and the operations that must never run while developing.
- Do not invoke anything under `scripts/` or `monitoring/`.

## Commands

- `bun run dev` serves the web app on :3000. Playwright owns :3001.
- `bun test` runs the Bun tests across all workspaces.
- In `apps/processor`, check with `cargo +nightly fmt -- --check`,
  `cargo clippy`, and `cargo test`. Its database tests need Docker for
  Testcontainers. CI runs these only when `apps/processor/**` changes.
- In `apps/docs`, lint with `npx markdownlint-cli2@0.17.2 '*.md'`. Building its
  image needs `git submodule update --init apps/docs/quartz`. CI lints the docs
  and checks their image only when `apps/docs/**` changes.
- In `apps/scripts`, run `uv sync --locked --extra e2e`, then check with
  `uv run ruff check src tests`, `uv run black --check src tests`, and
  `uv run python -m pytest tests -m 'not e2e'`. CI runs these only when
  `apps/scripts/**` changes.
- E2E specs are `apps/web/e2e/*.e2e.ts` and need the configured database,
  RabbitMQ, and auth fixtures. Write or run them only when instructed.
- Avoid `bun run build` and the full E2E suite — both build, and both are slow.
  Fast iteration outweighs exhaustive checks on small changes.
- Do not run the site or screenshot it to check your own work; the web
  designer and tester verify the preview deployment.

## Pull requests

- Every merge to `master` deploys to production once CI passes and is published
  as a GitHub release. There is no staging environment; try risky changes on a
  PR preview.
- A release builds the processor image only when `apps/processor/**` changed
  since the previous release, as `stagecodes/otr-processor:<release tag>`, and
  otherwise keeps the previous one. Its notes name the image it runs. A weekly
  cron outside this repository runs `latest` on Tuesdays at 12:00 UTC.
- Merging a change to `apps/scripts` deploys it nowhere yet. The production and
  dev hosts, including that cron, run a checkout of the otr-scripts repository,
  which that repository's own workflows deploy.
- Every release also builds the docs image, as
  `stagecodes/otr-docs:<release tag>`, and deploys it with the stack.
- The title is a [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  header, `type(scope)!: description`, because the squash merge uses it as the
  commit message. Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`,
  `build`, `ci`, `chore`, `style`, `revert`. The squash message body is blank,
  so a breaking change to the public API or a shared contract is marked with `!`
  in the title, not a `BREAKING CHANGE:` footer.
- The description follows `.github/pull_request_template.md`. Its
  `## Changelog` becomes the release notes, ending at `<!-- changelog:end -->`.
  It holds only bullets: user-facing changes in the past tense, with links to
  the pages they touch and details or API endpoints as sub-bullets. Write
  `- None` when nothing user-facing changed. Keep any text that is not release
  notes, such as a signature, after the end marker.
- `.github/scripts/release-notes.ts` checks both and writes the release notes.

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
- Migrations and metadata on `master` are immutable, since every merge deploys
  to production: never rewrite, rename, reorder, or delete merged SQL,
  snapshots, or journal entries.
- Commit the schema change, generated SQL, snapshot, and journal update together.
- Apply migrations only to a disposable local database. Start one with
  `docker compose up -d db` if nothing is running at `localhost:5432`.
- If a non-o!TR database is running at `localhost:5432`, make no writes and apply
  no migrations. Report it as a blocking issue.
- Physical SQL names and persisted numeric enums are contracts with the Rust
  processor in `apps/processor`. TypeScript cannot validate that consumer.
