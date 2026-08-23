# PR previews

Label a PR `preview` and it deploys to `https://otr-pr-<number>.<tailnet>.ts.net`,
private to the tailnet. Closing the PR removes the stack, its database clone, and
the tailnet node.

Previews run the website only. The database and queue come from the shared dev
tier (`docker-compose-dev.yml`), and there is no data worker, so previews make no
osu! API calls.

## Logging in

osu! OAuth registers a single redirect URI, so it cannot work on per-PR
hostnames. Previews set `E2E_TEST_AUTH=true` instead; mint a session with:

```
curl -X POST https://otr-pr-<number>.<tailnet>.ts.net/api/auth/e2e/sign-in \
  -H 'content-type: application/json' \
  -d '{"playerId": 1, "admin": true}'
```

The endpoint is unauthenticated, which is why previews stay off the public
internet.

## Databases

`otr_dev_seed` is restored from the otr-scripts dev replica, migrated up to the
default branch, and left idle; `otr_dev` is rebuilt from it and shared by every
preview. PRs that touch `apps/web/drizzle` get their own clone so they never
migrate the shared schema. Every deploy health-checks `otr_dev` first and
restores it if the check fails.

The seed migration uses `stagecodes/otr-web:staging-latest`, which tracks the
default branch; override with `DEV_MIGRATION_IMAGE`.

Previews share mutable state — one PR's admin actions change what another shows,
and the nightly refresh discards all of it.

## One-time setup

Tailnet: enable HTTPS certificates, add a `tag:preview` entry to `tagOwners`, and
grant the CI OAuth client permission to that tag.

`dev` GitHub environment:

| Secret                | Purpose                             |
| --------------------- | ----------------------------------- |
| `DEV_ENV`             | `.env` for the dev tier             |
| `PREVIEW_ENV`         | `.env` for every preview stack      |
| `DEV_REMOTE_PATH`     | Dev tier directory on the host      |
| `PREVIEW_REMOTE_PATH` | Parent directory for preview stacks |
| `OTR_SCRIPTS_DIR`     | otr-scripts checkout on the host    |

`TS_TAILNET` is a repository variable (`example-tailnet.ts.net`). `SSH_USER`,
`SSH_HOST`, `TS_OAUTH_*`, and `DOCKERHUB_*` are already configured for deploys.

Both secrets follow the `.env.example` convention: one file per deployment
holding application variables alongside the `DOCKER_`-prefixed overrides Compose
reads. `DEV_ENV` only needs the tier's own credentials, since that stack runs no
application containers:

```
DOCKER_POSTGRES_USER=postgres
DOCKER_POSTGRES_PASSWORD=...
DOCKER_POSTGRES_DB=postgres
DOCKER_RABBITMQ_USER=admin
DOCKER_RABBITMQ_PASSWORD=...
```

`PREVIEW_ENV` is the website's `.env`, pointed at the dev tier:

```
DOCKER_DATABASE_URL=postgresql://postgres:...@otr-dev-db:5432/otr_dev
DOCKER_RABBITMQ_AMQP_URL=amqp://admin:...@otr-dev-rabbitmq:5672/
BETTER_AUTH_SECRET=...
WEB_OSU_CLIENT_ID=placeholder
WEB_OSU_CLIENT_SECRET=placeholder
```

Use placeholder osu! credentials; the real ones are never needed. The workflow
appends the per-PR values (`IMAGE_TAG`, `PREVIEW_URL`, `TS_CLIENT_*`, and a
migration PR's own database) to this file, where the later key wins.
`E2E_TEST_AUTH` and `MAINTENANCE_WINDOW_ENABLED` are pinned in
`docker-compose-preview.yml` and do not belong here.

The dev tier needs its own otr-scripts `.env` on the host with `OTR_WEB_DIR`
pointing at the dev tier directory, `DB_CONTAINER=otr-dev-db`, `DB_PORT=5632`,
`DB_NAME=otr_dev_seed`, and `ENVIRONMENT=dev`. Recovery runs
`docker compose stop db` in `OTR_WEB_DIR`; pointing it at the production
directory would stop production.

Deploy the tier with the `Dev tier` workflow (`deploy`), which also refreshes the
replica nightly.
