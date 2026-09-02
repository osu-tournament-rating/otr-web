---
name: build-and-verify-otr-ui
description: Implement, refactor, debug, run, or visually verify user-facing UI and frontend data flows in otr-web. Use for Next.js routes and components, oRPC or SWR boundaries, Tailwind and shadcn styling, responsive or theme behavior, browser interaction checks, Playwright E2E, and preview-deployment verification.
---

# Build and verify otr-web UI

Use the current source as the authority. The design reference is `/beatmaps` and `/beatmaps/:id`; read `.agents/skills/otr-design-system/SKILL.md`.

## Work from the real feature boundary

1. Read the affected route and the specific components you are changing. Pull in anything else only when the change actually depends on it, and prefer a targeted grep over reading a whole file. E2E specs and `app/globals.css` are large; grep them for the symbol or token you need instead of reading them end to end, and read a spec in full only when you are editing it.
2. Trace the data from its server procedure or query helper into the rendered component before choosing a client boundary.
3. Reuse existing domain components, semantic theme tokens, icons, formatting helpers, and interaction patterns.
4. Implement all states the boundary can produce: loading, empty, error, disabled, success, and permission-restricted states as applicable.
5. Run focused static and behavior checks.
6. Run the relevant Playwright spec when its prerequisites are available. The web designer and tester exercise the workflow on the preview deployment.
7. Report what changed, commands and results, and any environment gap.

## Preserve frontend data boundaries

- Default URL-driven initial data and authenticated server reads to React Server Components.
- Use the typed helpers under `apps/web/lib/orpc/queries/`, React cache, Zod schemas, and server helpers rather than duplicating request code.
- Add `'use client'` only for browser interaction, state, or effects.
- Use SWR or SWR Infinite for reactive and paginated client reads. Use direct typed oRPC calls for explicit actions.
- Revalidate with the established SWR mutation or `router.refresh()` pattern after writes. Do not hand-roll data fetching in `useEffect`.
- If the required response shape or server behavior must change, load the contract skill before editing the procedure or schema.

## Preserve the visual system

- Reuse shadcn/Radix primitives and Lucide icons. Use `cn` and existing utility functions instead of duplicating class or formatting logic.
- Prefer semantic Tailwind tokens from `apps/web/app/globals.css`; do not hard-code colors when a semantic token exists.
- Start mobile-first and keep text, controls, charts, tables, and navigation within stable responsive constraints.
- Preserve accessible names, keyboard interaction, visible focus, sensible DOM order, and non-color status cues.
- Keep fixed-format controls and charts dimensionally stable across loading, hover, and dynamic content.
- Treat the beatmaps pages as the canonical pattern source; see `.agents/skills/otr-design-system/SKILL.md`.

## Run the local application

Engineers do not run the site or screenshot it to check their own work.

The web designer runs the site in prototype mode, against a disposable database on port
`5434` created with the `template-db` operation in `otr-scripts`. Never connect to the
Postgres on `localhost:5432`. Use the repository's root `.env` without printing,
replacing, or committing it.

```bash
bun run dev
```

The web app serves on `http://localhost:3000`. Poll `/` until it responds before you
navigate. If another process owns the port, use a different port; do not stop that
process. The data worker is not needed. If a page is empty or the database connection
fails, report the environment problem; do not mutate shared data.

## Verify the preview deployment

This section is for the web-designer and tester agents. An engineer stops after Checks.

Use any available Playwright-compatible browser automation against the pull request's
preview deployment. Do not commit auth state, traces, reports, logs, or intermediate
screenshots.

Screenshots are the default way to verify. Page snapshots and accessibility-tree dumps
are expensive and stay in context for the rest of the session, so treat them as opt-in:
reach for one only when you need accessible names, keyboard order, or DOM structure that
a screenshot cannot show. When you do need one, scope it to the affected element. Never
dump a whole-page tree when a scoped query answers the question.

Inspect the affected workflow at:

- Desktop `1440x1000` and mobile `390x844` — always.
- Light and dark themes — only when the change affects color, elevation, charts, or
  tokens.
- `767px` and `768px` — only when the change affects shared navigation or breakpoint
  behavior.

Confirm:

- No new uncaught page errors, console errors, or failed same-origin document, script,
  stylesheet, or fetch requests.
- `scrollWidth` does not exceed `clientWidth`; controls and text are not clipped or
  overlapping.
- Images have nonzero natural dimensions, fonts load, and charts contain nonblank
  rendered pixels.
- Keyboard controls, focus, loading and disabled behavior, and relevant URL state work
  after reload.
- Dynamic controls cannot double-submit, remain stuck, or resize the surrounding layout
  unexpectedly.

Never claim a visual pass without inspecting rendered output.

## Checks

Run the checks relevant to the change:

```bash
bunx prettier <changed-files> --check
bun run --filter web lint
bunx tsc --noEmit
bun test path/to/file.test.ts
cd apps/web && bun run test:e2e -- <relevant-spec>.e2e.ts
```

`bun run --filter web build` is slow and is not part of ordinary UI verification. Run it only when asked.

Playwright E2E builds and serves its own app on port 3001 and requires its configured database, RabbitMQ, and auth fixtures. Do not occupy that port with the interactive development server.

Do not run migrations, restore or drop databases, connect to production services, kill unrelated processes, or stop containers you did not start as part of UI verification.
