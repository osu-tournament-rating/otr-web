# otr-web

- `bun run dev` — Start both apps (web + data-worker) with shared env from `.env` at repo root.
- `bunx tsc --noEmit` — TypeScript compile check across workspaces.
- `bun run lint` — ESLint across workspaces (web + data-worker).
- `bun run build` — Build for production (not required to develop locally).
- `bunx drizzle-kit generate` — Create a new migration after schema changes.
- `bunx drizzle-kit migrate` — Apply migrations locally.

## Rules

- Always run `bunx tsc --noEmit` and `bun run lint` before you finalize changes.
- Prefer modern React/Next patterns over `useEffect` for data and UI lifecycle:
  - Default to Server Components in the App Router for data fetching and rendering.
  - Use server actions or oRPC procedures for mutations and data access; avoid client-initiated fetch chains when a server pathway is available.
  - Use `useEffect` only for imperative browser-only work (subscriptions, focus, measuring, non-data side effects).
  - For client data revalidation, prefer SWR with stable keys and caching helpers (see `apps/web/lib/utils/request-cache.ts`) instead of ad-hoc effects / hooks.
  - Co-locate validation with Zod schemas and pass parsed types through to UI.

## Conventions

### oRPC procedures

- Define endpoints with `publicProcedure` or `protectedProcedure` from `apps/web/app/server/oRPC/procedures/base.ts` to inherit DB, auth (when needed), and structured request logging.
- Validate `.input` and `.output` with Zod; attach OpenAPI metadata using `.route({ summary, tags, method, path })`. Tags: `public`, `authenticated`, `admin` (used by OpenAPI generator).
- Keep resource-first routing and admin operations under `*.admin.*` (see `apps/web/app/server/oRPC/router.ts`). Prefer returning Zod-parsed rows rather than raw DB objects.
- Where to add/register: put new procedures under `apps/web/app/server/oRPC/procedures/*` and register them in `apps/web/app/server/oRPC/router.ts` following the resource-first structure. Keep admin-only ops grouped under `*.admin.*`.

### Drizzle

- Source of truth for schema lives in `packages/otr-core/src/db/schema.ts` (import via `@otr/core/db` or `@otr/core/db/schema`). Do not define app-local tables.
- Prefer `db.query.<table>` helpers for simple reads; use `eq/and/sql` composition for complex cases; select columns explicitly for tight types and smaller payloads.
- Prefer deriving types from the schema and omitting fields rather than creating zod objects which duplicate portions of the schema.
- Migrations: configured in `drizzle.config.ts` (dialect: Postgres, out: `apps/web/drizzle`). Generate after schema edits; review SQL; apply locally.
- Output schemas with drizzle-zod: for `.output`, derive Zod schemas from the Drizzle schema using `createSelectSchema` and omit unwanted columns (e.g., full text `searchVector`). Example in `apps/web/lib/orpc/schema/base.ts`.
- Parse vs. trust: when returning rows across the oRPC boundary, parse with the derived `createSelectSchema` to ensure consistent shapes. Avoid hand-rolled Zod that duplicates table definitions.

### Parsing & casting

- Avoid bare casts like `Number(value)` or `+value` for external input. Prefer `z.coerce.number()` with `.int()`, bounds, and refinements, or `Number.parseInt/parseFloat` followed by `Number.isFinite` and range checks.
- Do not cast env vars directly. Follow `apps/data-worker/src/env.ts` patterns (`parseIntegerEnv`, `parsePositiveIntegerEnv`, `parseBooleanEnv`) for configuration parsing.
- For IDs that may exceed JS safe integers, keep them as `bigint` in-process and serialize at boundaries (see `apps/web/app/server/oRPC/procedures/base.ts:23` `normalizeOsuId`).

### Components, styling, and UI (shadcn, Tailwind)

- Tailwind v4 via `@tailwindcss/postcss` (see `apps/web/postcss.config.mjs`) with global tokens/utilities in `apps/web/app/globals.css`. Use CSS variables and theme tokens; prefer `@utility`/layers over inline styles.
- shadcn/ui components live in `apps/web/components/ui`. Use the `cn` helper (`apps/web/lib/utils.ts`) to merge classes; keep component anatomy and data-slot attributes consistent (see `ui/form.tsx`).
- Icons via `lucide-react`; notifications via `sonner` with theme from `next-themes`. Wrap app in `ThemeProvider` and `TooltipProvider` (see `app/layout.tsx`).
- SVGs are imported as React components via SVGR; use `?url` only when an actual URL is required (see `apps/web/next.config.ts`). Remote images allow `*.ppy.sh` only.
- Prefer utility classes and design tokens from `globals.css` (e.g., tier colors, chart palette); keep new utilities and variables colocated there.

### Organization

- Monorepo workspaces: `apps/web` (Next.js 15 + React 19), `apps/data-worker` (Bun worker), `packages/otr-core` (shared schema, domain, queues, utils).
- Path aliases: `@/*` -> `apps/web/*`; `@otr/core*` -> `packages/otr-core/src/*`. Keep imports aligned with these aliases.
- Env: root `.env` loaded via `lib/env/load-root-env.ts`. Do not add per-app `.env` files; load from root in configs and workers.
- DB: use `drizzle-orm/node-postgres` with `dbSchema` for both apps (`apps/web/lib/db/index.ts`, `apps/data-worker/src/db/index.ts`). Use the same `DATABASE_URL`.
- API surface: oRPC router (`app/server/oRPC/router.ts`) + OpenAPI handler (`app/api/[[...openapi]]/route.ts`). Prefer adding procedures over ad-hoc route handlers.

### Testing

- Skip tests unless explicitly asked. If you do add or modify tests, keep them scoped to the change and aligned with existing patterns.

## Helpful utilities

- Dates and time: `apps/web/lib/utils/date.ts` (UTC formatting, durations) and `apps/web/components/dates/FormattedDate.tsx` (client display). Example server parsing in `apps/web/app/server/oRPC/procedures/playerProcedures.ts:125`.
- Enums: `apps/web/lib/enums.ts` (UI metadata/helpers), `apps/web/lib/utils/enum.ts` (text↔enum conversions), `packages/otr-core/src/utils/enum.ts` (`coerceNumericEnumValue`).
- Duration helpers: `packages/otr-core/src/utils/time.ts` (`formatSecondsToMinutesSeconds`).
- Request dedupe: `apps/web/lib/utils/request-cache.ts` (`withRequestCache`, `clearRequestCache`).
- Class names and small helpers: `apps/web/lib/utils.ts` (`cn`, `capitalize`).

## Git instructions

- Use `gh` CLI for repo operations (e.g., `gh pr create`, `gh pr view`).
- Commits: <80 chars, concise, imperative. PRs: Sentence‑case title; short summary or bullets in body. Only add sections when the change is large.

## Apps

### Web (`apps/web`)

- App Router with RSC by default; keep data fetching on the server where possible. Mutations and reads should go through oRPC procedures.
- BetterAuth with Drizzle adapter; get sessions on the server via `auth.api.getSession({ headers })`. Use `SessionProvider` only to pass already-computed session data to client components.
- OpenAPI: public endpoints generated in `app/server/openapi.ts` and served from `app/api/[[...openapi]]/route.ts`. Require API key via `Authorization: Bearer <key>`.
- Lint config: `apps/web/eslint.config.mjs`. Tailwind v4 config via PostCSS; theme/dark mode handled in `app/globals.css` + `next-themes`.
- Client data: prefer SWR for stateful, client-rendered views (stable keys, cache, revalidation). Use `withRequestCache` only for short-lived client dedupe outside SWR (e.g., button-triggered actions) to avoid ad‑hoc effects.
- oRPC vs server actions: default to oRPC for shared API, logging, and auth. Use server actions only for narrow, UI-local mutations that won’t be reused by other clients. If accessing database, always use oRPC.

### Data Worker (`apps/data-worker`)

- Entrypoint `src/index.ts` wires RabbitMQ consumers/publishers and starts workers (osu data, osutrack, automation checks, stats). Respect graceful shutdown on SIGINT/SIGTERM.
- Rate limiting: use `FixedWindowRateLimiter` for external APIs with limits from `dataWorkerEnv` (`src/env.ts`).
- DB via `drizzle-orm/node-postgres` with shared `dbSchema`. Shares `DATABASE_URL` with web.
- Messaging via `amqplib` with queue names from `@otr/core/queues/constants`. Publish follow-up tasks via provided publishers.
- For new workers, define a service class (DB + API + limiter) and a worker wrapper (queue + service + logger), then register it in `src/index.ts`.

## Docker Compose

- Services: `db` (Postgres 17), `rabbitmq` (management UI on `http://localhost:15672`), `migrate` (one-shot, profile `migrate`), `web`, and `data-worker`.
- Root `.env` is loaded. Containers read connection strings from container-aware overrides:
  - `DOCKER_DATABASE_URL` is injected as `DATABASE_URL` for `web`, `data-worker`, and `migrate` services.
  - `DOCKER_RABBITMQ_AMQP_URL` is injected as `RABBITMQ_AMQP_URL`.
  - This allows local processes to use `localhost` URLs while containers use the compose network hosts (`db`, `rabbitmq`).
- First start infra only: `docker compose up -d db rabbitmq`.
- Run migrations in containers: `docker compose --profile migrate run --rm migrate` (uses `scripts/run-migrations.sh`).
- Start apps: `docker compose up -d web data-worker` (builds images if missing).
