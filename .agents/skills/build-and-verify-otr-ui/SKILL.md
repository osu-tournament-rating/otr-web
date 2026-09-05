---
name: build-and-verify-otr-ui
description: Build or verify rendered otr-web UI with its real data boundary, design system, task-owned local server, and disposable database.
---

# Build and verify otr-web UI

Read `otr-web/AGENTS.md`, `.agents/skills/otr-design-system/SKILL.md`, and
`.agents/design/README.md`. Read `apps/discord-bot/AGENTS.md` for Discord work.
Use the current route, affected components, and actual data boundary as source
evidence. The beatmap pages are the primary visual quality reference; player
pages are supporting polished references.

## Build the owning boundary

Trace typed server data into the rendered component. Reuse shared domain
components, semantic theme tokens, icons, formatting helpers, and interaction
patterns. Use React Server Components for server-owned initial data. Use the
established typed oRPC helpers and SWR patterns for reactive client data. Do not
hand-roll request effects or duplicate response types.

Implement every applicable loading, empty, error, disabled, success, and
permission state. Preserve accessible names, keyboard behavior, focus, DOM
order, non-color cues, and stable dimensions. Use semantic chart and table
colors for existing meanings in both themes.

The task owner implements and self-checks. A designer or tester can help with a
concrete question in explicitly requested lead mode; neither is mandatory.
Use existing design authorization and seek user input for a substantial unresolved
visual decision through a concrete preview or local artifact. Discord prototype artifacts
remain local, linked, and clearly approximate; do not post them to Discord
without explicit authorization.

## Use an isolated local environment

Never use the repository root `.env` as a blanket task configuration. Use only
the ignored variables required for the task. Point a data-backed website to the
assigned disposable `template-db` instance on port `5434`; offline bot artifacts
need no database. Never connect to port `5432`.

From `apps/web`, start an owned port with:

```bash
bun run dev --port <owned-port>
```

Do not stop, reuse, or inspect another task's server. During iteration, the
owner can inspect uncommitted work. Before independent review, identify the
source revision and ensure the task-owned server serves it. Restart when needed,
and give the reviewer the unchanged environment. Agent browser checks are
local; the preview belongs to user approval and final judgment.

If browser automation is unavailable, use an installed Playwright-compatible
CLI or report browser verification blocked. Do not assume a named MCP server is
configured.

## Browser checks

Always inspect the affected flow at desktop `1440x1000` and mobile `390x844`.
Inspect light and dark themes when colors, elevation, charts, or tokens change.
Check `767px` and `768px` only for shared breakpoint behavior.

Confirm relevant states, no new console or same-origin request failures, no
horizontal overflow or clipping, loaded images and fonts, nonblank settled
charts, keyboard and focus behavior, URL state after reload, and stable repeated
actions. Never claim a visual pass without inspecting the render.

## Checks

Use the smallest relevant set:

```bash
bunx prettier <changed-files> --check
bun run --filter web lint
bunx tsc --noEmit -p apps/web/tsconfig.json
bun test <focused-test>
git diff --check
```

UI unit and component tests can follow implementation. Write and run applicable
UI end-to-end tests during development. Substantive changes use one independent
reviewer after self-checks; the original owner fixes findings and requests focused
verification when needed. Follow the shared workflow without delayed E2E gates
or separate test-only review phases.

Playwright owns port `3001`, builds its app, and can reuse an unrelated existing
server outside CI; prove the server belongs to this worktree and commit before
reuse. Run a full build or E2E suite only when its coverage is required.

Report the commit, route, viewports and themes, scenarios, checks, and results.
Keep local paths, database names, and localhost URLs in the private task record.
