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

- **TypeScript**: strict mode; prefer interfaces, discriminated unions, and return types derived from Zod; avoid enums (use maps/constants)
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
- **Auth**: reuse helpers from `lib/auth/auth.ts`; respect existing session/token patterns
- **Environment**: rely on `env.d.ts` definitions; never hardcode secrets—pull from `process.env`
