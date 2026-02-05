# otr-web

Next.js 15 + React 19 monorepo.

## Commands

```bash
bun run dev                     # Start web + data-worker
bun run dev:turbo               # Web with Turbopack
bun run lint                    # ESLint all workspaces
bunx tsc --noEmit               # TypeScript check
bunx drizzle-kit generate       # Create migration
bunx drizzle-kit migrate        # Apply migrations

# Docker
docker compose up -d db rabbitmq           # Infrastructure
docker compose --profile migrate run --rm migrate  # Run migrations
docker compose up -d web data-worker       # Start apps
```

## Structure

```
otr-web/
├── apps/
│   ├── web/              # Next.js frontend + oRPC API
│   └── data-worker/      # Background job processor (Bun runtime)
├── packages/
│   └── otr-core/         # Shared schema, queues, utils
└── .env                  # Root environment (shared)
```

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
- **Zod v4** - `import { z } from 'zod/v4'` at all boundaries

## Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `PlayerCard.tsx`)
- Procedures: `camelCaseProcedures.ts` (e.g., `playerProcedures.ts`)
- Tests: `__tests__/*.test.ts` (co-located, Bun:test)

### oRPC Procedures
```typescript
publicProcedure
  .input(InputSchema)
  .output(OutputSchema)
  .route({ method: 'GET', path: '/endpoint', tags: ['domain'] })
  .handler(async ({ input, context }) => { ... })
```
- Errors via `ORPCError` with status codes: `'NOT_FOUND'`, `'UNAUTHORIZED'`
- Router namespaces: `admin.*`, `tournaments.*`, `reports.*`

### Schema Derivation
```typescript
import { createSelectSchema } from 'drizzle-zod'
const BaseSchema = createSelectSchema(table).omit({ searchVector: true })
```

## Critical Files

- `apps/web/app/server/oRPC/router.ts` - API router
- `apps/web/app/server/oRPC/base.ts` - Procedure context setup
- `packages/otr-core/src/db/schema.ts` - Schema source of truth
- `packages/otr-core/src/db/relations.ts` - Table relations
- `packages/otr-core/src/queues/constants.ts` - Queue names
- `apps/web/app/globals.css` - Tailwind v4 theme tokens

## Gotchas

- **KeyType resolution**: Procedures accept otr ID, osu ID, or username via `KeyTypeSchema`
- **Docker env vars**: Containers use `DOCKER_DATABASE_URL` → injected as `DATABASE_URL`
- **Request cache**: `withRequestCache()` prevents duplicate calls (5s TTL default)
- **Rate limiting**: Data worker has separate limiters for osu! API and osu!track API
