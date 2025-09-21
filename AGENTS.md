# OTR Web Development Agent Guidelines

## Build & Development Commands

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run lint         # Run ESLint
bun run format       # Format with Prettier
bunx tsc --noEmit     # Type check without emitting
```

## Architecture Transition

- **Current state**: migrating from a frontend-for-backend split to a monolithic Next.js app powered by oRPC for typed RPC calls and Drizzle ORM for data access. All new features MUST ignore the @osu-tournament-rating/otr-api-client package.
- **Legacy services**: older endpoints may still exist; prefer replacing them with shared oRPC procedures when touching related flows
- **Data layer**: move ad-hoc fetches into Drizzle models under `lib/db`, expose via oRPC, and consume through server components first
- **Incremental migration**: ship vertical slices that thread DB → oRPC → RSC; leave adapter layers or feature flags when parity with legacy APIs isn’t ready
- **Observability**: document migration status in PRs/notes and flag TODOs where legacy and new paths coexist to avoid long-term drift

## Workflow Expectations

- **Clarify scope**: confirm requirements, constraints, and affected surfaces before editing
- **Inspect first**: read existing components, hooks, and schemas to reuse patterns instead of re-inventing
- **Work incrementally**: prefer small, cohesive patches; keep related types, schema updates, and UI changes in sync
- **Surface blockers quickly**: if sandbox, approvals, or missing context prevent progress, pause and ask
- **Leave the trail**: summarize reasoning in PR descriptions or follow-up notes so future agents can understand intent

## Code Style & Conventions

- **TypeScript**: strict mode; prefer interfaces, discriminated unions, and return types derived from Zod; avoid enums (use maps/constants). Never use useEffect or other react hooks unless absolutely necessary. A justification comment must be written in this case. Follow NextJS best practices for data fetching.
- **Components**: functional components only, default exports, lowercase-dash directories; keep server components default and add `"use client"` only with justification
- **Imports**: use `@/` absolute paths; group React/Next → external libs → internal modules; remove unused imports
- **Naming**: descriptive booleans (isLoading, hasError), PascalCase components, camelCase helpers; follow existing async naming patterns
- **Structure**: exported component → subcomponents → hooks/helpers → static content → types; colocate tests and stories when meaningful

## Best Practices

- **Data flow**: prefer server-side fetching via RSC and `orpc` calls; centralize DB access in `lib/db` Drizzle models and reuse existing schemas
- **Validation**: enforce input/output contracts with Zod; transform to domain types before hitting UI layers
- **State management**: derive state from server data and URL search params via Next navigation helpers; reach for `useState` only for ephemeral UI state
- **UI & UX**: build with shadcn/Radix primitives, Tailwind utility-first styling, responsive defaults, and accessible interactions (ARIA, keyboard focus)
- **Performance**: suspense client components, batch fetches, avoid N+1 queries, prefer `Image` with WebP/AVIF and lazy loading
- **Error handling**: fail fast with guard clauses, return typed error objects, and surface user-friendly messages

## Testing & Quality

- **Static checks**: run `bun run lint`, `bun run format`, and `bunx tsc --noEmit` before handing off changes
- **Unit & integration**: add targeted tests near logic boundaries (lib, utils, hooks); prefer deterministic fixtures and fast feedback
- **Manual validation**: verify primary user journeys and regression areas touched by the change in development mode
- **Accessibility**: smoke-test with keyboard navigation and screen reader labels when altering interactive UI

## Collaboration & Handoff

- **Document**: update relevant README/MD files, comments, and Zod schemas when behavior changes
- **Communicate**: call out follow-up work, feature flags, or environment prerequisites in the final summary
- **Consistency**: mirror existing patterns; if diverging, explain rationale and consider introducing helpers for reuse
- **Review readiness**: ensure diffs are minimal, commit messages meaningful, and any generated files excluded from version control

## Tooling Tips

- **Database**: use Drizzle migrations (`bunx drizzle-kit generate`) and keep `schema.ts` + `relations.ts` aligned
- **ORPC**: define entity procedures under `app/server/oRPC/procedures/*`, expose them through `app/server/oRPC/router.ts`, colocate schemas under `lib/orpc/schema`, and type-share clients via generated typings
- **ORPC schemas**: derive Zod shapes directly from `lib/db/schema.ts` using `createSelectSchema`/`createInsertSchema` in `lib/orpc/schema/base.ts`, then compose variants with `.pick()`, `.omit()`, `.extend()`, or `.merge()` and handle fallbacks via top-level transforms after parsing
- **Auth**: reuse helpers from `lib/auth/auth.ts`; respect existing session/token patterns
- **Environment**: rely on `env.d.ts` definitions; never hardcode secrets—pull from `process.env`

## Project Structure

- **Routing**: `app/rpc/[[...rest]]/route.ts` mounts the oRPC router with `RPCHandler`, forwarding `request.headers` into the context; keep any new middleware-compatible context fields declared via `os.$context` in `app/server/oRPC/procedures/base.ts`.
- **API spec**: `app/api/openapi.json/route.ts` generates OpenAPI output using `@orpc/openapi` + `@orpc/zod`. When adding procedures, register schemas in `lib/orpc/schema/*` and ensure the generator has access to shared types.
- **Client access**: `lib/orpc/orpc.ts` creates the typed client via `createORPCClient` and dynamically resolves the base URL (server vs client). Server components, e.g. `app/leaderboard/page.tsx`, call this directly; avoid creating ad-hoc fetch clients.
- **Legacy wrappers**: `lib/api` and `lib/actions` still proxy `@osu-tournament-rating/otr-api-client`. Treat these as legacy surfaces—prefer threading DB → oRPC → RSC when touching related flows.
- **Session wiring**: `app/layout.tsx` reads headers, calls `getSessionFromHeaders`, and passes the result into the legacy `components/session-provider.tsx`. Update or replace that provider as new auth-aware vertical slices land.

## oRPC Implementation Notes

- **Context & middleware**: `os.$context` in `app/server/oRPC/procedures/base.ts` declares `headers` as the initial context. `publicProcedure` attaches the shared `db` instance; `protectedProcedure` chains Better Auth session resolution and throws `ORPCError('UNAUTHORIZED')` when absent. Mirror this pattern for additional middleware (timing, logging, etc.) per oRPC docs.
- **Handlers**: Procedures typically call `context.db.query.*` for relational access (leveraging Drizzle's Queries API) and throw typed `ORPCError`s for failure states. Keep inputs and outputs typed with Zod schemas stored in `lib/orpc/schema`.
- **Registration**: New procedures must be exported from their module, added to `app/server/oRPC/router.ts`, and then become available to the `orpc` client. Any new namespaces should match the router shape to preserve inferred types.
- **OpenAPI**: If a procedure should appear in the generated spec, provide `.route({ summary, tags, path })` metadata and ensure referenced schemas are part of `commonSchemas` when needed.

## Database & Drizzle

- **Single entry point**: `lib/db/index.ts` instantiates Drizzle with the Node Postgres driver and imports both `schema` and `relations`. Always access the database through `context.db` inside procedures or server actions to avoid duplicate pools.
- **Schema updates**: Add tables/columns in `lib/db/schema.ts` and mirror relations in `lib/db/relations.ts`. Run `bunx drizzle-kit generate` to emit SQL under `drizzle/`, then apply via your preferred workflow (`drizzle-kit push` or SQL execution).
- **Queries**: Favor the relations API (`db.query.*.findMany/findFirst`) for nested lookups and readable filters, falling back to SQL builders (`db.select().from(...)`, `sql```) for complex aggregates as seen in `leaderboardProcedures.ts`.
- **Testing**: When adjusting schema-backed logic, extend or create focused tests against the relevant utilities or procedures to protect query expectations.

## Authentication & Sessions

- **Better Auth setup**: `lib/auth/auth.ts` configures Better Auth with the Drizzle adapter (`provider: 'pg'`, `usePlural: true`) and maps the generated tables (`auth_users`, `auth_sessions`, etc.) from `lib/db/schema`. Plugins include `admin`, `genericOAuth` (osu! provider), `customSession`, and `nextCookies`—keep new plugins ordered before cookies per Better Auth guidance.
- **Custom session envelope**: The `customSession` plugin enriches sessions with `dbPlayer` and `dbUser` lookups and parses the numeric `osuId`. Reuse this shape via the exported `AppSession` type when needing strongly typed session data.
- **Server access**: `auth.api.getSession({ headers })` inside `protectedProcedure` enforces authentication. Prefer this instead of reaching for cookies directly.
- **Client access**: `lib/auth/auth-client.ts` initializes `authClient` with the same base URL and exposes `signIn`, `signOut`, and `useSession`. Client components such as `components/buttons/LoginButton.tsx` call these helpers—avoid duplicating OAuth flow code.

## Legacy Surfaces & Migration Notes

- **Middleware**: `middleware.ts` now only performs legacy cookie cleanup. Handle any authentication or authorization requirements within the relevant route modules instead of relying on middleware.
- **Session provider**: `components/session-provider.tsx` relies on `UserDTO` from the deprecated API. Plan to replace it with a Better Auth + oRPC powered context before removing the legacy client.
- **Server helpers**: `lib/api/server.ts` and the server `lib/actions/*` files wrap legacy endpoints. When modifying these areas, consider introducing oRPC procedures that replicate required functionality, then phase out the wrappers.
- **Documentation**: Call out migration touchpoints in PR descriptions and add TODOs where both legacy and new flows must coexist temporarily.

## Environment & Secrets

- Defined in `env.d.ts`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_OSU_CLIENT_ID`, `WEB_OSU_CLIENT_SECRET`, `DATA_WORKER_OSU_CLIENT_ID`, `DATA_WORKER_OSU_CLIENT_SECRET`, optional `API_KEY`, plus deprecated `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_APP_BASE_URL` for legacy clients.
- Set `NEXT_PUBLIC_APP_BASE_URL` so the oRPC client and Better Auth client resolve correct URLs in SSR and CSR contexts.
- Never commit `.env`; reference `env.d.ts` for required values and update it when adding new configuration.

## Utilities & Patterns

- **Request caching**: `lib/utils/request-cache.ts` provides a simple in-memory dedupe for server-side calls (`withRequestCache`). Use or extend it rather than rolling your own memoization in middleware/layouts.
- **Shared schemas**: `lib/schema.ts` hosts Zod schemas that still depend on the legacy API enums. Note any refactors to align these schemas with Drizzle-backed data before removing the dependency.
- **UI primitives**: Components lean on shadcn/Radix and Tailwind utilities in `components/ui/*`; reuse these building blocks for new UI instead of importing directly from third-party libs.
