# OTR Agent Handbook

## Repository Map

- `apps/web` – Next.js 15 app (App Router, React Server Components by default) executed with Bun. Houses UI, oRPC router, auth wiring, and domain-specific server logic.
- `apps/data-worker` – Bun-based worker that consumes and publishes RabbitMQ messages for osu! data, automation checks, and tournament stats.
- `packages/otr-core` – Shared source of truth for Drizzle schema, relations, enums, queue message contracts, and common utilities consumed by both apps.
- `lib/env/load-root-env.ts` – Lightweight helper to prime `process.env` across packages; ensure it covers new environment keys.
- `docker-compose.yml` – Local stack for Postgres 17, RabbitMQ 4 (management UI enabled), build images for web + worker, and optional migration job.
- `.github/workflows` – CI (lint / typecheck / builds) and deploy pipelines. Mirror local scripts so actions stay green.
- Support files: `.env.example`, `data-worker-refactor.md` (historical plan), `README.md`, `CLAUDE.md` placeholder.

## Daily Commands

- `bun install --frozen-lockfile` – Install workspace dependencies.
- `bun run dev` – Run `apps/web` and `apps/data-worker` concurrently (traps signals; ctrl+c stops both).
- `bun run --filter web dev` / `bun run --filter data-worker dev` – Target a single workspace during focused work.
- `bun run lint` – Aggregated ESLint (`next` config for web, `eslint` for worker).
- `bunx tsc --noEmit` – Type check all packages with the shared `tsconfig.json`.
- `bun run build` – Builds web (Next production) and the worker binary.
- `bun run format` – Format with Prettier + Tailwind plugin. Use sparingly; prefer scoped formatting for reviews.
- `bun run --filter data-worker test` – Executes Bun tests (unit + integration) for the worker.

## Environment & Tooling

- Copy `.env.example` → `.env` and populate all secrets. Rate limit variables (`OSU_API_RATE_LIMIT_*`, `OSUTRACK_API_RATE_LIMIT_*`) must be positive integers.
- `NEXT_PUBLIC_APP_BASE_URL` must reflect the origin used by both Next SSR and Better Auth; keep it accurate for OpenAPI spec generation and the oRPC client.
- Distinguish credentials: `WEB_OSU_CLIENT_*` for the web auth flow; `DATA_WORKER_OSU_CLIENT_*` for API fetchers.
- Load env variables via `loadRootEnv()` before accessing them in scripts or config (e.g., `drizzle.config.ts`, `apps/data-worker/src/env.ts`). Update `apps/web/env.d.ts` or `apps/data-worker/env.d.ts` whenever new keys are added.
- `bunx drizzle-kit generate` creates SQL migrations under `apps/web/drizzle/` using `packages/otr-core/src/db/schema.ts`. Apply with `bunx drizzle-kit push` or through the `migrate` Docker profile.
- Docker images (`apps/web/Dockerfile`, `apps/data-worker/Dockerfile`) install the monorepo and run package-specific builds; keep them aligned with new runtime deps.

## Architecture

### Web Application (`apps/web`)

- Runs on Next.js 15 App Router. Server components are default; add `'use client'` only when interactive hooks are unavoidable and justify the decision inline.
- `app/layout.tsx` runs on the server, retrieves sessions via `auth.api.getSession`, maps to a typed `SessionUser`, and hydrates the client-only `SessionProvider` while wrapping shell UI (header/footer, sonner toasts, tooltips, theme provider).
- Routing: domain folders under `app/` (e.g., `leaderboard`, `tournaments`, `tools`). Pages typically fetch data via the oRPC client (`lib/orpc/orpc.ts`) inside RSC functions.
- RPC surface: `app/server/oRPC/procedures/*` defines procedures grouped by domain (admin notes, tournaments, matches, filtering, stats, etc.). Use `publicProcedure` for unauthenticated access and `protectedProcedure` when a session is required. Admin-only flows reuse `ensureAdminSession` from `procedures/shared/adminGuard.ts` to enforce scopes.
- The oRPC router is assembled in `app/server/oRPC/router.ts` and mounted in `app/rpc/[[...rest]]/route.ts` using the fetch handler adapter. Update both when adding new namespaces or methods.
- Zod schemas for inputs/outputs live in `lib/orpc/schema`. Use `createSelectSchema` + `.omit()`/`.pick()` to derive shapes from Drizzle schema (`@otr/core/db`). Shared constants go in `lib/orpc/schema/constants.ts`.
- `app/api/openapi.json/route.ts` generates the OpenAPI specification via `@orpc/openapi` + `@orpc/zod`. Register new schemas and tags when procedures should appear in the spec.
- Database access runs through `lib/db/index.ts`, which instantiates Drizzle for Node Postgres with `dbSchema` from the shared package. Avoid ad-hoc client creation; leverage `context.db` provided by the base middleware when inside oRPC procedures.
- Authentication uses Better Auth (`lib/auth/auth.ts`) with the Drizzle adapter. Plugins include `admin`, `genericOAuth` (osu!), `customSession`, and `nextCookies`. Account linking ensures a player record exists and keeps username/country in sync.
- Client auth helpers (`lib/auth/auth-client.ts`) expose `useSession`, `signIn`, and `signOut`. UI components should consume session data via `SessionContext` (`components/session-provider.tsx`) or `lib/hooks/useSession`.
- UI primitives follow shadcn patterns, located in `components/ui/*`. Tailwind CSS 4 (see `app/globals.css`) drives styling; prefer utility classes and theme tokens before custom CSS.
- Legacy cleanup: `middleware.ts` now only removes a deprecated cookie. Do not resurrect the previous `@osu-tournament-rating/otr-api-client` surfaces.

### Data Worker (`apps/data-worker`)

- Entry point `src/index.ts` wires RabbitMQ publishers/consumers, rate limiters, osu! API client, automation checks, and stats processing. Services follow dependency injection so they can be tested in isolation.
- Environment settings are parsed and validated in `src/env.ts`; missing or malformed values throw immediately. Respect the configurable rate limits when introducing new requests.
- RabbitMQ helpers (`src/queue/rabbitmq-consumer.ts`, `rabbitmq-publisher.ts`) wrap `amqplib`, assert priority queues using `QueuePriorityArguments`, and provide ack/nack utilities. Keep queue names in sync with `QueueConstants` from `@otr/core/queues`.
- Rate limiting uses `FixedWindowRateLimiter` (`src/rate-limiter/fixed-window.ts`) to provide backpressure with queueing semantics. Reuse this abstraction for new outbound APIs.
- osu! data fetchers live under `src/osu` (client helpers, conversion functions, services, workers). Tournament stats live in `src/stats` (calculator, service, worker, probability helpers). Automation checks reside in `src/automation-checks` mirroring legacy behavior.
- Tests: unit suites under `src/**/__tests__`, worker suites under `src/osu/workers/__tests__`, and integration/E2E cases in `tests/integration`. Add coverage adjacent to the logic you touch and prefer deterministic fixtures.

### Shared Core (`packages/otr-core`)

- `src/db/schema.ts` and `src/db/relations.ts` define the Drizzle schema that both apps consume. Extend them in lockstep and regenerate migrations after changes.
- Queue contracts (`src/messages/types.ts`) and priority metadata (`src/messages/values.ts`) describe the envelopes passed through RabbitMQ. Reuse these types across publishers and consumers.
- Domain enums (rulesets, mods, verification status, etc.) live in `src/osu`. Web Zod schemas and data worker logic import from here to maintain parity.

## Implementation Guidance

- **Vertical slices first.** Prefer threading new features through DB → oRPC → server components, adding adapters or feature toggles only when migration parity demands it.
- **Database access.** Use Drizzle query APIs (`db.query.*`, `eq`, `and`) where possible. Complex aggregates may fall back to `db.select().from(...)` or tagged SQL. Keep strong types by reusing shared schema and Zod select shapes.
- **oRPC best practices.** Derive inputs with Zod, throw `ORPCError` for typed failures, and attach metadata via `.route({ summary, tags, path })` when exposing procedures to OpenAPI. Reference the oRPC docs (`context7` library `/unnoq/orpc`) for middleware and adapter patterns when in doubt.
- **Authentication & authorization.** Fetch sessions through Better Auth (`auth.api`) instead of cookies. Guard admin flows with `hasAdminScope` helpers and reject unauthorized access early.
- **Caching & utils.** Use `withRequestCache` (`lib/utils/request-cache.ts`) for transient server-side de-dupe instead of custom memoization. Centralize shared helpers in `lib/utils` and keep them pure.
- **Client components.** Limit `'use client'` to interactive-only surfaces (header, dialogs, charts). When adding one, ensure server-only code stays outside the client boundary and document why hooks are necessary.
- **Error handling.** Log failures with structured context (`consoleLogger` for worker, console logging in web) and surface user-friendly messages. Favor guard clauses and typed error objects over silent fallbacks.
- **Performance.** Batch oRPC calls, paginate results, and avoid N+1 database patterns. When streaming large tables to the client, lean on virtualization (`@tanstack/react-virtual`) already in use.

## Testing & Quality Bar

- Run `bun run lint`, `bunx tsc --noEmit`, and relevant tests before handing off a change. Use `bun run build` when altering build tooling.
- Data worker suites can be scoped with Bun's test filters; integration tests may require Postgres and RabbitMQ (use Docker compose for parity).
- Web-side procedure tests live in `app/server/oRPC/procedures/**/__tests__`. Mirror their patterns (mock context, assert ORPC responses) when adding new endpoints.
- Accessibility: keyboard navigation and aria labels must be validated when modifying UI primitives. Rely on shadcn components for baseline semantics.
- It is crucial to not use `any`, `unknown`, or `as unknown as` syntax. Unless it is impossible or extraordinarily inconvenient to do so, everything must be completely typed. When modifying files, look for usage of this syntax in that specific file and modernize it if found. Expansion syntax (`...prop`) is okay. Never use `Object.assign`.

## Deployment & Operations

- CI (`.github/workflows/ci.yml`) installs Bun, lints, type-checks, builds web, and compiles the worker. Keep command names aligned with package scripts.
- `deploy.yml` / `deploy-trigger.yml` orchestrate environment deployments. When changing build outputs (e.g., moving artifacts), update these workflows and Dockerfiles simultaneously.
- Docker compose exposes Postgres on `5432`, RabbitMQ on `5672`/`15672`, and runs services using the same Bun commands. Check volume mounts before introducing schema-changing migrations.

## Collaboration & Handoff

- Clarify scope before editing; confirm whether a task touches both web and worker surfaces.
- Inspect existing modules to match established patterns rather than re-implementing helpers.
- Document reasoning in PR descriptions or follow-up notes—especially around migration status between legacy and new paths.
- Surface blockers early (sandbox limits, missing secrets, migrations). Pause and ask before taking destructive actions on shared resources.
- Keep commits focused and avoid reformatting unrelated files. Respect existing dirty changes; never revert work you did not create without explicit direction.

## Pre-Submit Checklist

- [ ] Requirements, constraints, and affected surfaces understood and documented.
- [ ] `.env` implications noted; `env.d.ts` updated when adding new keys.
- [ ] DB access routed through Drizzle helpers and shared schema types.
- [ ] New RPC procedures registered, schema-validated, and included in OpenAPI when appropriate.
- [ ] Worker queue interactions reuse `QueueConstants` and message envelopes.
- [ ] Tests/lint/typecheck/build commands executed (or limitations called out) with next steps suggested.
- [ ] Follow-up tasks, feature flags, or TODOs captured in code comments or handoff notes.

Stay disciplined about the DB → oRPC → RSC pipeline, keep Bun workspace scripts aligned across tooling, and the o!TR stack will remain predictable and easy to evolve.
