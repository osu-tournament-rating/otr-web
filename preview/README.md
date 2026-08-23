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

The dev tier holds two databases. Which one a setting names is never
interchangeable:

- `otr_dev_seed` is the restore target. otr-scripts restores the dev replica
  into it, it is migrated up to the default branch, and it then sits idle so
  nothing holds a connection and it can act as a template.
- `otr_dev` is the live database, recreated from the seed and shared by every
  preview.

PRs that touch `apps/web/drizzle` clone the seed into `otr_pr_<number>` so they
never migrate the shared schema. Every deploy health-checks `otr_dev` first and
restores it if the check fails.

The seed migration uses `stagecodes/otr-web:staging-latest`, which tracks the
default branch; override with `DEV_MIGRATION_IMAGE`.

Previews share mutable state — one PR's admin actions change what another shows,
and the nightly refresh discards all of it.

## One-time setup

### Tailnet

Enable HTTPS certificates. Previews serve themselves with `tailscale serve`, and
`ts-config/serve.json` sets `AllowFunnel` false, so they stay off the public
internet.

Use two OAuth clients, each scoped to a single tag:

| Client         | Tag           | Stored in                      |
| -------------- | ------------- | ------------------------------ |
| `TS_OAUTH_*`   | `tag:ci`      | GitHub secrets, runner only    |
| `TS_PREVIEW_*` | `tag:preview` | the preview `.env` on the host |

These must be different clients. The preview `.env` lands on the deployment host
and is passed to a container running unreviewed PR code, so a client reachable
from there can only ever mint `tag:preview` nodes.

The policy file needs:

```hujson
"tagOwners": {
  "tag:ci":      [],
  "tag:deploy":  [],
  "tag:preview": [],
},
"grants": [
  {"src": ["autogroup:member"], "dst": ["*"], "ip": ["*"]},
  {"src": ["tag:ci"], "dst": ["tag:deploy"], "ip": ["tcp:22"]},
],
"ssh": [
  {"src": ["tag:ci"], "dst": ["tag:deploy"], "users": ["<deploy account>"],
   "action": "accept"},
],
```

The owner lists stay empty. An OAuth client may advertise the exact tag set it
was issued, so CI still authenticates, while no tagged device can tag another
one — never let `tag:ci` own `tag:ci` or `tag:preview`.

`tag:preview` gets no `src` rule at all: a preview answers connections you open
to it and can open none of its own. Tag the deployment host `tag:deploy` rather
than `tag:ci`; the runner holds `tag:ci`, and sharing one tag leaves the policy
unable to tell them apart. Deploys run over Tailscale SSH — the workflow carries
no key material — so the `ssh` rule is required, and a tagged source cannot use
check mode.

### `dev` GitHub environment

| Secret                 | Purpose                             |
| ---------------------- | ----------------------------------- |
| `DEV_ENV`              | `.env` for the dev tier             |
| `PREVIEW_ENV`          | `.env` for every preview stack      |
| `DEV_REMOTE_PATH`      | Dev tier directory on the host      |
| `PREVIEW_REMOTE_PATH`  | Parent directory for preview stacks |
| `OTR_SCRIPTS_DIR`      | otr-scripts checkout on the host    |
| `TS_PREVIEW_CLIENT_ID` | `tag:preview` OAuth client id       |
| `TS_PREVIEW_SECRET`    | `tag:preview` OAuth client secret   |

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
`SSH_HOST`, `TS_OAUTH_*`, and `DOCKERHUB_*` are already configured for deploys;
`TS_PREVIEW_*` is new and has to be created.

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
their credentials must match `DEV_ENV`; the rest are what the app itself needs.
The database here is the live `otr_dev`, never the seed:

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

## otr-scripts

The dev tier needs a checkout of otr-scripts of its own. `lib.config` loads the
`.env` beside the code and requires every field, so one checkout cannot hold
both a production and a dev configuration:

```
ENVIRONMENT=dev
TAG=latest
DUMP_DIR=/home/otr-dev/db-dumps
PUBLIC_HTML_DIR=/home/otr-dev/html
OTR_WEB_DIR=/home/otr-dev/dev-tier
DB_PORT=5632
DB_CONTAINER=otr-dev-db
DB_USER=postgres
DB_NAME=otr_dev_seed
DB_PASSWORD=replace-me
GCS_TEST_BUCKET=otr-test
GCS_DEV_BUCKET=otr-dev-replica
GCS_PUBLIC_BUCKET=otr-public-replica
GCS_PROD_BUCKET=otr-prod-dumps
GCS_SA_JSON_PATH=/home/otr-dev/.gcs/sa.json
RABBITMQ_URL=amqp://admin:replace-me@localhost:5872
```

`DB_NAME` is the seed, never the live database: recovery drops and recreates
whatever it names, and `dev-db.sh` rebuilds `otr_dev` from it afterwards.
`DB_PASSWORD` and the `RABBITMQ_URL` credentials match `DEV_ENV`. Only
`GCS_DEV_BUCKET` is read during a restore; the other buckets just have to be
present. `RABBITMQ_URL` is likewise unused by `recovery` but required, and
addresses the host's published port because `processor` runs with
`--network host`.

Two settings are destructive if they point at production:

- `OTR_WEB_DIR` is where recovery runs `docker compose stop db`. It must be the
  dev tier directory.
- `DUMP_DIR` is emptied with `rm` after a successful restore. Give the dev tier
  its own, or a dev restore deletes production's downloaded archives.

Deploy the tier with the `Dev tier` workflow (`deploy`), which also refreshes the
replica nightly.
