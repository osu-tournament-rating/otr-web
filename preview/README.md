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

The three paths are absolute, and previews sit beside the dev tier rather than
inside it so teardown's `rm -rf` can never reach it. For a host account at
`/home/otr-dev`:

```
/home/otr-dev/
├── dev-tier/              DEV_REMOTE_PATH
│   ├── .env               DEV_ENV
│   ├── docker-compose.yml copied from docker-compose-dev.yml
│   └── scripts/preview/dev-db.sh
├── previews/              PREVIEW_REMOTE_PATH
│   └── pr-796/
│       ├── .env           PREVIEW_ENV plus the per-PR lines
│       ├── docker-compose.yml
│       └── ts-config/serve.json
└── otr-scripts/           OTR_SCRIPTS_DIR
```

Database files are not in any of these. Postgres writes to the named volume
`otr-dev_postgres-data`, so size the docker volume filesystem for the seed, the
live copy, and one clone per open migration PR.

`SSH_USER` and `SSH_HOST` are read from the `dev` environment. Set them there if
that host or account differs from production, and give the account docker
access.

`TS_TAILNET` is a repository variable (`example-tailnet.ts.net`). `SSH_USER`,
`SSH_HOST`, `TS_OAUTH_*`, and `DOCKERHUB_*` are already configured for deploys.

Both secrets follow the `.env.example` convention: one file per deployment
holding application variables alongside the `DOCKER_`-prefixed overrides Compose
reads. Each template below is complete. Every line is required, and nothing
else is read.

`DEV_ENV` is the dev tier's `.env`. That stack runs no application containers,
so these five values only fill in `docker-compose-dev.yml`:

```
DOCKER_POSTGRES_USER=postgres
DOCKER_POSTGRES_PASSWORD=replace-me
DOCKER_POSTGRES_DB=postgres
DOCKER_RABBITMQ_USER=admin
DOCKER_RABBITMQ_PASSWORD=replace-me
```

`PREVIEW_ENV` is the website's `.env`. The first two point at the dev tier and
their credentials must match `DEV_ENV`; the rest are what the app itself needs:

```
DOCKER_DATABASE_URL=postgresql://postgres:replace-me@otr-dev-db:5432/otr_dev
DOCKER_RABBITMQ_AMQP_URL=amqp://admin:replace-me@otr-dev-rabbitmq:5672/
BETTER_AUTH_SECRET=replace-me
WEB_OSU_CLIENT_ID=placeholder
WEB_OSU_CLIENT_SECRET=placeholder
```

Generate a fresh `BETTER_AUTH_SECRET`. The osu! credentials are never used, so
leave them as placeholders — previews sign in through the test-auth endpoint and
never reach osu! OAuth.

Deliberately absent from both files:

- `IMAGE_TAG`, `PREVIEW_URL`, `PREVIEW_HOSTNAME`, `TS_CLIENT_ID`,
  `TS_CLIENT_SECRET`, and a migration PR's own `DOCKER_DATABASE_URL` are
  appended per PR by the workflow, where the later key wins.
- `DATABASE_URL`, `RABBITMQ_AMQP_URL`, `BETTER_AUTH_URL`,
  `NEXT_PUBLIC_APP_BASE_URL`, `E2E_TEST_AUTH`, and `MAINTENANCE_WINDOW_ENABLED`
  are set in `docker-compose-preview.yml`, which overrides `env_file`.
- `NEXT_PUBLIC_IS_STAGING` is inlined at build time, so setting it at runtime
  does nothing.
- `METRICS_AUTH_TOKEN` only guards `/api/metrics`, and nothing scrapes a
  preview.
- `DATA_WORKER_*`, `OSU_API_RATE_LIMIT_*`, and `PLAYER_*_REFETCH_*` belong to
  the data worker, which previews do not run.

The dev tier needs its own otr-scripts `.env` on the host with `OTR_WEB_DIR`
pointing at the dev tier directory, `DB_CONTAINER=otr-dev-db`, `DB_PORT=5632`,
`DB_NAME=otr_dev_seed`, and `ENVIRONMENT=dev`. Recovery runs
`docker compose stop db` in `OTR_WEB_DIR`; pointing it at the production
directory would stop production.

Deploy the tier with the `Dev tier` workflow (`deploy`), which also refreshes the
replica nightly.
