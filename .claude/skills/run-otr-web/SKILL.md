---
name: run-otr-web
description: Run, launch, start, build, test, screenshot, or drive the otr-web Next.js app. Use when asked to see a change working in the real app, capture a screenshot of a page, or boot the web frontend locally on :3000.
---

# Run otr-web

otr-web is a Next.js 16 + React 19 monorepo (web frontend + a background data-worker).
The frontend is launched with `bun run --filter web dev` (port **3000**) and **driven with
the Playwright MCP browser tools** (`browser_navigate` → `browser_take_screenshot`). It
needs PostgreSQL + RabbitMQ running and a **seeded** database — empty pages otherwise.

> All paths below are relative to the repo root (`otr-web/`). Run commands from there
> unless a `cd` is shown.

## Prerequisites

- `bun` (1.3.x) and `docker`.
- A configured `.env` at the repo root. Copy the template and fill it in if missing:
  ```bash
  cp .env.example .env
  ```
  Required for the web app: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `NEXT_PUBLIC_APP_BASE_URL` (`http://localhost:3000`), `RABBITMQ_AMQP_URL`,
  `WEB_OSU_CLIENT_ID`, `WEB_OSU_CLIENT_SECRET`. A low-entropy `BETTER_AUTH_SECRET` only
  logs a warning locally — it still boots.
- A **seeded** database. The app reads real tournaments/players/matches; with an empty DB
  the pages render but show nothing. Seed via a production-replica restore using
  `otr-scripts` — `.github/workflows/e2e-tests.yml` is the canonical recipe.

## Infrastructure

Bring up Postgres + RabbitMQ (leave them running):

```bash
docker compose up -d db rabbitmq
```

On a **fresh** database, apply the schema (canonical step; skip if the DB is already
migrated — e.g. a restored replica):

```bash
bunx drizzle-kit migrate
```

## Run — agent path (preferred)

**1. Launch the web app only** (the data-worker is not needed for UI work):

```bash
bun run --filter web dev
```

Run it in the background and wait for `:3000` to answer (Turbopack; ~first request
compiles on demand):

```bash
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { echo "up"; break; }
  sleep 2
done
```

**2. Drive it with Playwright MCP.** Browsers are already installed. Use the MCP
tools against seeded routes:

- `browser_navigate` → `http://localhost:3000/stats` (platform statistics — charts render
  immediately) or `http://localhost:3000/players/440` (a populated profile).
- `browser_snapshot` to inspect the DOM / find elements to act on.
- `browser_take_screenshot` (`fullPage: true` for long pages) — saves a PNG you can Read
  back to confirm the change rendered.
- `browser_click` / `browser_wait_for` for interactions.

Good seeded routes (from `apps/web/e2e/fixtures/test-config.ts`): `/stats`,
`/players/440`, `/tools/audit-logs`. These are public — no login needed.

## Run — human path

```bash
bun run --filter web dev   # web only, :3000
bun run dev                # web + data-worker together
```

`apps/web` `dev` already runs Turbopack under Next 16; `dev:turbo` is the explicit alias.

## Test (secondary — not for screenshots)

The repo has a Playwright e2e suite. It is a pass/fail check, **not** the ad-hoc
screenshot tool — it builds and starts its **own** server on **:3001** via the
`webServer` block in `apps/web/playwright.config.ts`:

```bash
cd apps/web
bun run test:e2e --list                  # sanity check — lists the 41 tests, no build
bun run test:e2e                          # headless; build + start :3001, run e2e/*.e2e.ts
bun run test:e2e:headed                   # watch it
```

The full run does `bun run build` first, so it's slow. HTML report lands in
`apps/web/playwright-report/`.

## Data-worker (when you need it)

```bash
bun run --filter data-worker dev
```

Requires extra env beyond the web app: `DATA_WORKER_OSU_CLIENT_ID/SECRET` and the
`OSU_API_RATE_LIMIT_*` / `OSUTRACK_API_RATE_LIMIT_*` / `PLAYER_OSU*` vars —
`apps/data-worker/src/env.ts` throws on startup if any are missing. Exposes metrics on
`:9091`.

## Gotchas

- **Two different ports.** `dev` = **:3000**; the e2e suite spins up its own server on
  **:3001**. Don't point the MCP at 3001 expecting your dev session, and don't run both
  expecting them to share state.
- **Seeded DB required.** Pages render with an empty DB but show no data. The 90k-player
  production-replica restore is what makes `/stats` and `/players/*` meaningful.
- **Env is hard-required.** `apps/web/env.d.ts` and `apps/data-worker/src/env.ts` enforce
  the variables above; missing data-worker vars throw immediately.
- **Docker containers use `DOCKER_DATABASE_URL`** (injected as `DATABASE_URL` inside the
  container), not the host `DATABASE_URL`. Irrelevant when running `bun run dev` on the host.
- **`bunx drizzle-kit migrate` writes to the shared DB.** You may write migrations to this db,
  but be aware that manual intervention will be required to undo the operation - only perform
  migrations when highly confident that changes will not need to be reverted.
- The player page logs a couple of benign console errors/warnings (avatar/image related);
  the page still renders fully.

## Troubleshooting

- **`curl :3000` returns 000 / connection refused** — server not up yet (Turbopack compiles
  the first request) or not started. Check the dev log; wait and re-poll.
- **Blank charts / empty tables** — the DB isn't seeded. Restore a replica (see
  Prerequisites), don't expect data from `docker compose up` alone.
- **MCP screenshot is blank or shows an error page** — you navigated before the route
  compiled, or hit :3001 with no server. Re-navigate `:3000` after the readiness poll.
