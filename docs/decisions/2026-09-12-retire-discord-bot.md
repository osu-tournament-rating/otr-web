# Retire the Discord bot

Decision date: 2026-09-12. Status: accepted.

## Decision and context

The Discord bot is completely out of scope for o!TR. Remove the implementation
and its operating and development support from `otr-web`. Do not retain a dormant
workspace, feature flag, or backlog for restarting bot development.

The bot was an unreleased, stateless interface to the website's typed `/rpc` API.
It duplicated access to player, tournament, leaderboard, and beatmap information
while requiring its own command registration, presentation, dependencies,
deployment, monitoring, and agent workflows. This decision reverses that product
direction and keeps development focused on the website, API, and data pipeline.
It does not change tournament verification or rating meaning.

## Removed

- `apps/discord-bot`, including commands, views, charts, emojis, previews, tests,
  Dockerfile, and nested agent guidance.
- The `dev:bot` command, bot TypeScript inputs, bot workspace dependencies, and
  bot manifest copies in the web and data-worker Dockerfiles.
- The bot image build/publish step, production and staging Compose services,
  local image build, CI lint cache, Prometheus scrape jobs, and dedicated Grafana
  series and styling.
- `x-otr-client` request attribution, the `discord-bot` access method, and shared
  bot client constants. Requests are attributed to a session, API key, or anonymous
  caller using the existing authentication context.
- Bot-specific repository design references and agent workflow instructions.
  Installed personal bot skills/routing and shared agent role guidance are also
  retired locally; these unversioned files are outside this repository's PR.

The bot owns no database tables, persisted state, queues, or API procedures.
No migration, backfill, rating rebuild, or public API schema change is required.
Its shared statistics, search, leaderboard, and entity endpoints remain available.

## Environment cleanup

Remove these fields from local `.env` files and the staging/production `ENV`
secrets after adopting this revision:

| Field                  | Former use                                       |
| ---------------------- | ------------------------------------------------ |
| `DISCORD_BOT_TOKEN`    | Bot gateway login, command and emoji management. |
| `DISCORD_BOT_GUILD_ID` | Guild-scoped development command registration.   |

Neither field has a consumer after retirement. Existing values are ignored by
the remaining applications; this change does not edit deployed secret values.

Keep these settings:

- `DISCORD_WEBHOOK_URL`: Grafana alert delivery to Discord.
- `CHANGELOG_WEBHOOK_URL`: GitHub Actions secret for release notifications;
  this is not an application `.env` field.
- `INTERNAL_APP_BASE_URL` and `NEXT_PUBLIC_APP_BASE_URL`: website server-side RPC
  and public links.
- `METRICS_PORT`, `METRICS_AUTH_TOKEN`, and shared `OTEL_*` settings: web and worker
  monitoring and tracing. The bot's service-specific Compose overrides disappear.

Release notifications, alert webhooks, and the community/support link remain
supported, as explicitly requested when making this decision.

## Rollout and recovery

The next deployment builds only the web and data-worker images. Existing
`docker compose ... up -d --remove-orphans` deployment behavior removes the old
bot service in the same Compose project. Updated Prometheus and Grafana files
remove its dedicated monitoring configuration. This PR does not perform a live
deployment or restart services.

Separately launched development gateways and registered Discord commands are
external state. Operators should stop those gateways and retire their Discord
application credentials/registrations. Removing source does not revoke a token
or delete commands from Discord, and this change does not perform those actions.

The code remains recoverable in Git history. The last base before this removal
is [`70b4e85a`](https://github.com/osu-tournament-rating/otr-web/tree/70b4e85a/apps/discord-bot).
Any future bot proposal requires a new explicit product decision. Git history is
an investigation reference, not an instruction to restore the feature.

## Backlog disposition

Close these bot-only proposals as **not planned**:

- [#881: dedicated beatmap scores command](https://github.com/osu-tournament-rating/otr-web/issues/881).
- [#885: dedicated beatmap pool history command](https://github.com/osu-tournament-rating/otr-web/issues/885).

Website/API issues that mention an optional bot enhancement remain open for their
non-bot scope. Their bot suggestions are superseded by this decision. In
particular, this applies to #891, #892, #893, and the app-wide environment work
in #900.
