---
name: build-and-verify-otr-ui
description: Implement, refactor, debug, run, or visually verify user-facing UI and frontend data flows in otr-web. Use for Next.js routes and components, oRPC or SWR boundaries, Tailwind and shadcn styling, responsive or theme behavior, local startup, browser interaction checks, Playwright E2E, screenshots, or player-page reference capture.
---

# Build and verify otr-web UI

Use the current source as the authority. The bundled player-page screenshots are visual references, not pixel-perfect specifications and not substitutes for inspecting the running application.

## Work from the real feature boundary

1. Read `AGENTS.md`, the affected route, neighboring domain components, relevant `components/ui` primitives, `app/globals.css`, and the closest E2E spec.
2. Trace the data from its server procedure or query helper into the rendered component before choosing a client boundary.
3. Reuse existing domain components, semantic theme tokens, icons, formatting helpers, and interaction patterns.
4. Implement all states the boundary can produce: loading, empty, error, disabled, success, and permission-restricted states as applicable.
5. Run focused static and behavior checks before opening the browser.
6. Exercise the real workflow in the development app at desktop and mobile sizes, then run the relevant Playwright spec when its prerequisites are available.
7. Report what changed, commands and results, visual checks, and any environment gap.

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
- Treat current implementation and behavior as newer than the reference images when they disagree.

## Run the local application

Use the repository's existing root `.env` without printing, replacing, or committing it. The local environment already contains the data needed for realistic UI verification, so do not migrate, restore, or seed the database merely to verify UI.

```bash
bun run dev
```

The web app normally serves on `http://localhost:3000`. Poll `/` until it responds before navigating. If the port is already owned by an unrelated process, use another port rather than stopping that process.

The data worker is not needed for ordinary UI verification. If a page is empty or the database connection fails, report the environment problem; do not mutate shared data to make a screenshot work.

## Verify in a browser

Use any available Playwright-compatible browser automation. If no browser integration is available, use the repository's installed Playwright package from a temporary untracked script or the CLI. Do not commit auth state, traces, reports, logs, or intermediate screenshots.

At minimum, inspect the affected workflow at:

- Desktop: `1440x1000`
- Mobile: `390x844`
- Light and dark themes when the change affects color, elevation, charts, or tokens
- `767px` and `768px` when the shared navigation or breakpoint behavior changes

Confirm:

- There are no new uncaught page errors, console errors, or failed same-origin document, script, stylesheet, or fetch requests.
- `scrollWidth` does not exceed `clientWidth`; controls and text are not clipped or overlapping.
- Images have nonzero natural dimensions, fonts load, and charts contain nonblank rendered pixels after animation settles.
- Keyboard controls, focus, loading/disabled behavior, and relevant URL state work after reload.
- Dynamic controls cannot double-submit, remain stuck, or resize the surrounding layout unexpectedly.

Never claim a visual pass without inspecting rendered output.

## Player-page references

The reusable references live at:

- `assets/references/player-page-desktop.png`
- `assets/references/player-page-mobile.png`

Open them only when player-page hierarchy or the broader design language is relevant. They capture `/players/440` in the light theme using the existing local database.

When intentionally refreshing them:

1. Run the normal development server and verify `/players/440` behaves correctly before capture.
2. Use an isolated browser context, device scale factor 1, reduced motion, and the desktop/mobile viewports above.
3. Wait for fonts, images, data, and chart animation; progressively scroll so lazy content renders.
4. Inspect the top, middle, and bottom of both full-page images.
5. Exclude the Next.js development toolbar from the image only after confirming it is not reporting an application error.
6. Do not update the references merely to make a regression look expected.

## Checks

Run the checks relevant to the change:

```bash
bunx prettier <changed-files> --check
bun run --filter web lint
bunx tsc --noEmit
bun test path/to/file.test.ts
bun run --filter web build
cd apps/web && bun run test:e2e -- <relevant-spec>.e2e.ts
```

Playwright E2E builds and serves its own app on port 3001 and requires its configured database, RabbitMQ, and auth fixtures. Do not occupy that port with the interactive development server.

Do not run migrations, restore or drop databases, connect to production services, kill unrelated processes, or stop containers you did not start as part of UI verification.
