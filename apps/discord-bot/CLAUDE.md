# o!TR Discord bot

## Purpose

The bot gives osu! tournament players, mappoolers, and mappers the site's player,
tournament, beatmap, and leaderboard pages as Discord embeds. It reads the site
over `/rpc` and stores nothing.

## Commands

| Command                                   | Procedures                                                        | Chart                  | Buttons                                  |
| ----------------------------------------- | ----------------------------------------------------------------- | ---------------------- | ---------------------------------------- |
| `/player name [ruleset]`                  | `players.stats`, then `players.tournaments` or `players.beatmaps` | rating history         | Overview, Tournaments, Pooled maps, link |
| `/tournament name` (autocomplete)         | `tournaments.list`, `tournaments.get`                             | none                   | Overview, Players, Pool, Matches, Forum  |
| `/beatmap query` (autocomplete)           | `beatmaps.list`, `beatmaps.stats`                                 | score percentile curve | Overview, Scores, Tournaments, osu! link |
| `/leaderboard [ruleset] [country] [page]` | `leaderboard.list`                                                | none                   | previous, next, link                     |

## Layout

- `src/index.ts` starts tracing, the metrics server, and the gateway client.
- `src/runner.ts` is the only file that talks to Discord: defer, limits, errors, metrics.
- `src/commands/` builds the slash command data, calls the API, and picks a view.
- `src/views/` turns fetched data into `Reply` objects; `theme.ts` holds the colors.
- `src/chart/` builds SVG strings and rasterizes them to PNG.
- `src/__tests__/` holds the fake API, fake interactions, and typed fixtures.
- `scripts/preview.ts` runs one command against a live site and writes the PNGs to `.tmp/`.

## Contract

- A command is a pure function: `execute({ options, api, ctx })` returns a `Reply` of embeds, components, and files.
- The runner owns `deferReply`, the embed limits (`finalize`), the error embeds, and the metrics.
- A button keeps all state in its `custom_id` (`1:<view>:<key>:<ruleset>:<page>[:<country>]`); a click after a restart works.
- A `ReplyError` message is shown to the user. An oRPC `NOT_FOUND` shows the command's `notFound` copy.

## Data

- `Api` is `RouterClient<typeof router>` from a type-only import of the site router.
- Runtime imports from the site are limited to `@/lib/enum-helpers`, `@/lib/utils/tierData`, and `@/lib/utils/mods` (ESLint enforces the list).
- Never import `@/lib/orpc/schema/*` at runtime, never import bare `@otr/core`, never open the database.
- Every call carries `x-otr-client: discord-bot`; the site labels it `accessMethod=discord-bot`.

## Env

`DISCORD_BOT_TOKEN` (blank idles the bot), `DISCORD_BOT_GUILD_ID` (dev guild for instant command updates), `NEXT_PUBLIC_APP_BASE_URL` (shared with the site; embed links), `INTERNAL_APP_BASE_URL` (API base inside compose), `METRICS_PORT` (default 9091).

## Run and test

- `bun test` from the repository root; no token and no network.
- `bun run --cwd apps/discord-bot preview player name=Stage` renders one reply against `INTERNAL_APP_BASE_URL`.
- `bun run dev:bot` with a token and `DISCORD_BOT_GUILD_ID` set registers the commands to that guild.

## Charts

SVG in `src/chart/svg.ts`, PNG through resvg in `src/chart/png.ts` with the bundled `assets/Inter-Regular.ttf` (OFL). Tier icons and the logo come from `apps/web/public`.

## Release

`deploy.yml` builds `stagecodes/otr-discord-bot` with the same tag as the web and worker images; both compose stacks run it beside the data worker. A blank or invalid token keeps the container up with `/health` at 200.
