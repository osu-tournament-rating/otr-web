# otr-web agent guidance

## Scope

These instructions apply to the entire repository. Work from the repository root unless a command says otherwise. Inspect the implementation and adjacent tests before editing, keep changes focused, and preserve unrelated work.

## Repository layout

- `apps/web/` contains the Next.js App Router site, oRPC server and client code, Better Auth integration, UI components, and Playwright tests.
- `apps/data-worker/` contains Bun workers for queue consumption, osu! and osu!track ingestion, automation checks, statistics, and scheduled refetching.
- `packages/otr-core/` is the shared contract layer for the Drizzle schema, relations, domain enums, messages, queues, logging, and maintenance-window helpers.
- `apps/web/drizzle/` contains ordered SQL migrations and Drizzle metadata generated from the shared schema.
- `scripts/` contains local, migration, and E2E database helpers. `monitoring/` contains deployment observability configuration. Do not invoke these.

Use `@/` for web-local imports and `@otr/core` or `@otr/core/*` for shared code. Do not duplicate shared contracts inside an application workspace.

## Open agent skills

Portable skills live under `.agents/skills/` and follow the Agent Skills `SKILL.md` format.

- Read `.agents/skills/change-otr-contracts/SKILL.md` before changing physical database identifiers, Drizzle schema or migrations, persisted enums, queue names or messages, verification or rating semantics, public oRPC/OpenAPI contracts, API-key behavior, or other web/worker/processor boundaries.
- Read `.agents/skills/build-and-verify-otr-ui/SKILL.md` before changing browser-visible routes, pages, components, styles, frontend data flow, responsive behavior, themes, or visual tests.
- Read both for an end-to-end feature that changes a contract and its UI.

Do not use vendor-specific slash-command or subagent syntax to refer to these skills. Load the relevant `SKILL.md` directly when the task matches.

## Setup and commands

Use Bun 1.3.x. Install exactly as CI does:

```bash
bun install --frozen-lockfile
```

Common commands:

```bash
bun run dev                    # Web app on :3000
bun run dev:worker             # Data worker only
bun run dev:all                # Web app and data worker
bun test                       # Bun tests across the workspaces
bun test path/to/file.test.ts  # Focused test file
bun run lint
bunx tsc --noEmit
bunx prettier . --check
bun run format                 # Rewrite with Prettier
bun run build
```

Playwright owns its server on port 3001:

```bash
cd apps/web
bun run test:e2e
bun run test:e2e -- player-profile.e2e.ts
```

The E2E suite requires its configured database, RabbitMQ, and auth fixtures. Use the UI skill for interactive browser checks and local screenshot setup.

## Implementation conventions

- Keep TypeScript strict. Follow the existing Prettier configuration: single quotes, ES5 trailing commas, and Tailwind class sorting.
- Default to React Server Components for initial and URL-driven data. Add `'use client'` only for browser state, effects, or interaction.
- Reuse typed oRPC query helpers, SWR patterns, request caching, shared UI primitives, `cn`, and existing formatting utilities before adding alternatives.
- Keep data-visualization copy minimal and functional. Do not repeat surrounding page context in chart titles, legends, or explanatory caveats; verification is an eligibility invariant on surfaces that already contain verified-only data, not recurring UI copy.
- Validate request and external inputs with the existing Zod and oRPC patterns. Preserve typed errors and explicit authorization checks.
- Procedures live under `apps/web/app/server/oRPC/procedures/` and must be registered in the router. A `public` route tag changes the OpenAPI surface; it does not make API-key authentication optional at `/api`.
- Preserve session, role, API-key, maintenance-window, audit, transaction, queue metadata, and correlation-ID behavior when editing those paths.
- Queue consumers must handle acknowledgement, retry, poison-message, and idempotency behavior deliberately. Keep external API calls behind the existing rate limiters.
- Automation checks run from score to game to match to tournament. Preserve manually locked verification decisions and add focused behavior tests for rule changes.
- Add Bun tests beside implementation as `__tests__/*.test.ts`. Browser workflows belong in `apps/web/e2e/*.e2e.ts`.
- Never weaken assertions, authorization, or validation merely to make a check pass.

## Database and migration rules

- `packages/otr-core/src/db/schema.ts` is the model source of truth. Create migrations from the repository root with `bunx drizzle-kit generate` and inspect the generated SQL.
- Treat every migration and metadata file already present in the latest release tag as immutable. Never rewrite, rename, reorder, or delete released SQL, snapshots, or journal entries.
- Commit the schema change, generated SQL, snapshot, and journal update together.
- Apply migrations only to a disposable local database unless the user explicitly names and approves another target.
- Physical SQL names and persisted numeric enums are contracts with `otr-processor`; TypeScript compilation cannot validate those consumers. Use the contract skill before changing them.

## Verification

- Start with the narrowest relevant test, then run lint, TypeScript, and Prettier checks for code changes.
- Run the full Bun test suite and build for broad, cross-package, migration, or release-relevant changes.
- Follow the UI skill for browser-visible changes and inspect rendered output at desktop and mobile sizes.
- Report the commands actually run, their results, and any skipped checks or missing prerequisites. Do not claim validation that was not performed.

## Safety

- Keep secrets out of Git and logs. `.env` remains local; `.env.example` contains placeholders only. Never print session, OAuth, API-key, database, RabbitMQ, or service-account secrets.
- Do not edit generated or dependency output such as `node_modules/`, `.next/`, `dist/`, coverage, Playwright reports/results, or `*.tsbuildinfo`.
- Get explicit confirmation before database restore/drop/truncate operations, `docker compose down -v`, non-local migrations, live queue or external-API operations, deployment, release, push, or forceful Git operations.
- Do not bypass auth, admin scopes, audit attribution, maintenance protection, or rate limits for convenience.
- Do not revert unrelated changes. Do not amend or force-push unless explicitly requested.

## Git conventions

```text
Branch: <short-kebab-case-description>

Commit:
<Imperative verb> <specific outcome>
(#<issue>)  # optional
```

- Branch names use two to five meaningful lowercase kebab-case terms, such as
  `agent-skills-refactor`, `rating-decay-window`, or `player-layout-fix`.
- Do not require `feature/`, `fix/`, `hotfix/`, `chore/`, usernames, vendors, or
  issue numbers.
- Tool-generated, Dependabot, upstream-sync, and scratch-worktree branches are
  exceptions.
- Commit subjects use sentence case and imperative mood, preferably at most 72
  characters, without a trailing period or Conventional Commit prefix.
- Avoid opaque subjects such as `fmt`, `prettier`, `cleanup`, or `(wip)`.
- Let GitHub add pull request numbers and merge metadata.
