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

| Secret                  | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `DEV_ENV`               | Compose variables for the dev tier                     |
| `PREVIEW_ENV`           | Application config for preview web containers          |
| `PREVIEW_DB_URL_PREFIX` | e.g. `postgresql://postgres:password@otr-dev-db:5432/` |
| `PREVIEW_RABBITMQ_URL`  | e.g. `amqp://admin:admin@otr-dev-rabbitmq:5672/`       |
| `DEV_REMOTE_PATH`       | Dev tier directory on the host                         |
| `PREVIEW_REMOTE_PATH`   | Parent directory for preview stacks                    |
| `OTR_SCRIPTS_DIR`       | otr-scripts checkout on the host                       |

`TS_TAILNET` is a repository variable (`example-tailnet.ts.net`). `SSH_USER`,
`SSH_HOST`, `TS_OAUTH_*`, and `DOCKERHUB_*` are already configured for deploys.

`PREVIEW_ENV` must set `E2E_TEST_AUTH=true` and `MAINTENANCE_WINDOW_ENABLED=false`,
carry a fresh `BETTER_AUTH_SECRET`, and use placeholder osu! credentials — the
real ones are never needed here.

The dev tier needs its own otr-scripts `.env` on the host with `OTR_WEB_DIR`
pointing at the dev tier directory, `DB_CONTAINER=otr-dev-db`, `DB_PORT=5632`,
`DB_NAME=otr_dev_seed`, and `ENVIRONMENT=dev`. Recovery runs
`docker compose stop db` in `OTR_WEB_DIR`; pointing it at the production
directory would stop production.

Deploy the tier with the `Dev tier` workflow (`deploy`), which also refreshes the
replica nightly.
