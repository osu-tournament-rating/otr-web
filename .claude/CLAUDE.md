# otr-web

Next.js 16 + React 19 Bun-workspace monorepo for osu! Tournament Rating.

## Commands

```bash
bun run dev                     # Web app only (data-worker NOT started)
bun run dev:all                 # Web + data-worker
bun run lint                    # ESLint all workspaces
bunx tsc --noEmit               # TypeScript check
bun run format                  # Prettier, required before committing
bun test                        # Unit/service tests (Bun) across all workspaces
bun test path/to/file.test.ts   # Single test file
cd apps/web && bun run test:e2e # Playwright e2e (boots web on :3001, E2E_TEST_AUTH=true)
bunx drizzle-kit generate       # Create migration (output → apps/web/drizzle)
bunx drizzle-kit migrate        # Apply migrations
```

CI (`.github/workflows/ci.yml`) runs `test`, `lint`, `typecheck`, `format` as a
matrix plus a `build` job. The Husky pre-commit hook formats staged files, then runs
`bunx tsc` and `bun run lint`.

## Structure

```
otr-web/
├── apps/
│   ├── web/              # Next.js frontend + oRPC API
│   └── data-worker/      # Background job processor (Bun runtime)
├── packages/
│   └── otr-core/         # Shared schema, queues, messages, logging, osu! enums
└── .env                  # Root environment (shared)
```

## Architecture

Three workspaces talk to one Postgres DB and one RabbitMQ broker:

- **`apps/web`** serves two distinct API surfaces plus the UI:
  - oRPC at `/rpc` — session-authenticated, used by the website. Procedures live in
    `apps/web/app/server/oRPC/procedures/`.
  - Public OpenAPI at `/api` (`/api/openapi.json` for the spec) — derived from oRPC
    procedures tagged `public`, authenticated by API key
    (`Authorization: Bearer <key>` or `x-api-key`).
  - Auth is **Better Auth** (osu! OAuth, admin roles, API keys) at `/api/auth/*`; a
    test-only auth plugin is gated by `E2E_TEST_AUTH`.
- **`apps/data-worker`** is a standalone Bun process. It consumes RabbitMQ queues
  (`prefetch: 1`), calls the osu! and osu!track APIs under fixed-window rate limits,
  and writes results back to Postgres. Services cover beatmaps, matches, players,
  osu!track history, automation checks, tournament stats, and scheduled refetching;
  they are wired up in `apps/data-worker/src/index.ts`.
- **`packages/otr-core`** is the shared contract layer (Drizzle schema + relations,
  queue names, message envelopes, logging, osu! enums). The web app publishes queue
  messages; the worker consumes them — both import the contracts from here.

DB migrations: edit the schema in `packages/otr-core/src/db/schema.ts`, then
`bunx drizzle-kit generate` emits SQL to `apps/web/drizzle`.

## Path Aliases

- `@/*` → `apps/web/*`
- `@otr/core/*` → `packages/otr-core/src/*`
- `@otr/core/osu` → osu! enums
- `@otr/core/queues` → queue constants

## Key Patterns

- **Server Components by default** - Use RSC for data fetching
- **oRPC for API** - Procedures in `apps/web/app/server/oRPC/procedures/`
- **Drizzle for DB** - Schema in `packages/otr-core/src/db/schema.ts`
- **SWR + withRequestCache** - Client data with request deduplication
- **Zod v4** - `import { z } from 'zod'` (project is on zod 4.x) at all boundaries

## Conventions

### File Naming

- Components: `PascalCase.tsx` (e.g., `PlayerCard.tsx`)
- Procedures: `camelCaseProcedures.ts` (e.g., `playerProcedures.ts`)
- Unit tests: `__tests__/*.test.ts` (co-located, `bun test`)
- E2E tests: `apps/web/e2e/*.e2e.ts` (Playwright)

### oRPC Procedures

```typescript
publicProcedure
  .input(InputSchema)
  .output(OutputSchema)
  .route({ method: 'GET', path: '/endpoint', tags: ['domain'] })
  .handler(async ({ input, context }) => { ... })
```

- Procedure builders (from `procedures/base.ts`): `publicProcedure`,
  `protectedProcedure` (requires session), `adminMutationProcedure` (admin role)
- Errors via `ORPCError` with status codes: `'NOT_FOUND'`, `'UNAUTHORIZED'`
- Router namespaces: `admin.*`, `tournaments.*`, `reports.*`

### Schema Derivation

```typescript
import { createSelectSchema } from 'drizzle-zod';
const BaseSchema = createSelectSchema(table).omit({ searchVector: true });
```

## Critical Files

- `apps/web/app/server/oRPC/router.ts` - API router
- `apps/web/app/server/oRPC/procedures/base.ts` - Procedure builders + context setup
- `apps/data-worker/src/index.ts` - Worker entry: queue consumers + service wiring
- `packages/otr-core/src/db/schema.ts` - Schema source of truth
- `packages/otr-core/src/db/relations.ts` - Table relations
- `packages/otr-core/src/queues/constants.ts` - Queue names
- `apps/web/app/globals.css` - Tailwind v4 theme tokens

## Gotchas

- **KeyType resolution**: Procedures accept otr ID, osu ID, or username via `KeyTypeSchema`
- **Docker env vars**: Containers use `DOCKER_DATABASE_URL` → injected as `DATABASE_URL`
- **Request cache**: `withRequestCache()` prevents duplicate calls (5s TTL default)
- **Rate limiting**: Data worker has separate limiters for osu! API and osu!track API
- **Worktrees**: The repository to use is always osu-tournament-rating/otr-web, even when in a directory like otr-web-1

## Rules

- NEVER create migrations without the use of `bunx drizzle-kit generate`
- NEVER edit a migration that is already in production — i.e. any migration in
  `apps/web/drizzle` present in the latest tagged commit. Those are immutable history.
- A migration NOT present in the latest tagged commit is not yet released; you may
  freely delete and re-create it (e.g. regenerate after a schema tweak).
