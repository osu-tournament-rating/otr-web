# OTR Contract Reference

This file records cross-service facts that are easy to miss. Re-read the named sources before changing a contract because this snapshot can age.

## Contents

- [Ownership And Data Flow](#ownership-and-data-flow)
- [Physical PostgreSQL Contract](#physical-postgresql-contract)
- [Persisted Values](#persisted-values)
- [RabbitMQ Contract](#rabbitmq-contract)
- [Verification And Rating Semantics](#verification-and-rating-semantics)
- [API And Authentication Boundaries](#api-and-authentication-boundaries)
- [Common Pitfalls](#common-pitfalls)

## Ownership And Data Flow

- `otr-web/packages/otr-core` owns the Drizzle schema, relations, persisted TypeScript enums, queue names, and TypeScript message envelopes.
- `otr-web/apps/web` owns the website's oRPC router, public OpenAPI projection, Better Auth integration, and web-side queue publishers.
- `otr-web/apps/data-worker` consumes all four queues, fetches upstream data, runs automated verification checks, and writes rosters plus player match/tournament statistics.
- `otr-processor` reads and mutates the same PostgreSQL database through raw SQL, recomputes ratings, and publishes tournament IDs for statistics refresh.
- `otr-scripts` supplies the operational database/processor invocation contract. Environment or container-interface changes must be checked there.

## Physical PostgreSQL Contract

The Rust processor binds to snake_case SQL identifiers and concrete PostgreSQL types in `otr-processor/src/database/db.rs`. The important surface is broader than the four verified competition tables:

| Physical table            | Processor contract                                                                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tournaments`             | Reads `id`, `name`, `ruleset`, and `verification_status`; joins through matches.                                                                                                                                 |
| `matches`                 | Reads `id`, `name`, `start_time`, nullable `end_time`, `tournament_id`, `verification_status`, `updated`.                                                                                                        |
| `games`                   | Reads `id`, `ruleset`, `start_time`, `end_time`, `match_id`, `verification_status`, `updated`.                                                                                                                   |
| `game_scores`             | Reads `id`, `player_id`, `game_id`, `score`, `placement`, `verification_status`, `updated`; rewrites `placement` and `updated` for all rows.                                                                     |
| `players`                 | Reads `id`, `username`, and `country`.                                                                                                                                                                           |
| `player_osu_ruleset_data` | Reads `player_id`, `ruleset`, nullable `earliest_global_rank`, and `global_rank` for initial ratings. Drizzle permits null `global_rank`, but Rust reads it as a required `i32`; a null row can fail processing. |
| `player_ratings`          | Truncates with identity reset/cascade, then `COPY`s `player_id`, `ruleset`, `rating`, `volatility`, `percentile`, `global_rank`, `country_rank`; reads inserted `id`s.                                           |
| `rating_adjustments`      | Truncates with identity reset/cascade, then `COPY`s `player_id`, `ruleset`, `player_rating_id`, nullable `match_id`, before/after rating and volatility, `timestamp`, and `adjustment_type`.                     |
| `player_highest_ranks`    | Reads all columns; inserts or updates `player_id`, `ruleset`, global/country ranks and their dates. It is not rebuilt with current ratings.                                                                      |
| `player_match_stats`      | The processor deletes rows for non-verified matches or tournaments; the data worker, not the processor, calculates and inserts them.                                                                             |
| `player_tournament_stats` | The processor deletes rows for non-verified tournaments and reads `created` to decide refresh; the data worker calculates and inserts them.                                                                      |

The processor also joins these tables to count tournament players and compare `matches.updated`, `games.updated`, and `game_scores.updated` with statistics creation time. A physical rename, type/nullability change, new required column without a default, trigger change, or semantic change can break the weekly transaction even when otr-web type-checks.

Drizzle camelCase properties are not the Rust contract. For example, `verificationStatus: integer('verification_status')` may be renamed on the TypeScript side without changing raw SQL only if `'verification_status'` remains unchanged.

Current lifecycle in `otr-processor/src/main.rs` is one transaction: recalculate score placements, load verified input, recompute ratings, replace current ratings/adjustments, update highest ranks, remove stale stats, and enqueue needed stats refreshes. Messages are published before that transaction commits, so consumers must not assume publish-after-commit ordering. The stats worker reads the shared tables and replaces affected rosters/stat rows in its own transaction.

## Persisted Values

These values are stored in PostgreSQL or sent on RabbitMQ. Preserve ordinals and bit assignments.

```text
VerificationStatus: None=0, PreRejected=1, PreVerified=2, Rejected=3, Verified=4
Ruleset: Osu=0, Taiko=1, Catch=2, ManiaOther=3, Mania4k=4, Mania7k=5
RatingAdjustmentType: Initial=0, Decay=1, Match=2, VolatilityDecay=3
DataFetchStatus: NotFetched=0, Fetching=1, Fetched=2, NotFound=3, Error=4
MessagePriority: Low=0, Normal=5, High=10
ScoringType: Score=0, Accuracy=1, Combo=2, ScoreV2=3, Lazer=4
TeamType: HeadToHead=0, TagCoop=1, TeamVs=2, TagTeamVs=3
Team: NoTeam=0, Blue=1, Red=2
ScoreGrade: SSH=0, SH=1, SS=2, S=3, A=4, B=5, C=6, D=7
```

Rejection and warning values are bit flags:

```text
TournamentRejectionReason: None=0, NoVerifiedMatches=1, NotEnoughVerifiedMatches=2,
  AbnormalWinCondition=4, AbnormalFormat=8, VaryingLobbySize=16, IncompleteData=32
MatchRejectionReason: None=0, NoData=1, NoGames=2, NamePrefixMismatch=4,
  FailedTeamVsConversion=8, NoValidGames=16, UnexpectedGameCount=32,
  NoEndTime=64, RejectedTournament=128
GameRejectionReason: None=0, NoScores=1, InvalidMods=2, RulesetMismatch=4,
  InvalidScoringType=8, InvalidTeamType=16, FailedTeamVsConversion=32,
  NoValidScores=64, LobbySizeMismatch=128, NoEndTime=256,
  RejectedMatch=512, BeatmapNotPooled=1024
ScoreRejectionReason: None=0, ScoreBelowMinimum=1, InvalidMods=2,
  RulesetMismatch=4, RejectedGame=8
MatchWarningFlags: None=0, UnexpectedNameFormat=1, LowGameCount=2,
  UnexpectedBeatmapsFound=4, OverlappingRosters=8
GameWarningFlags: None=0, BeatmapUsedOnce=1
```

`Mods` and `FilteringFailReason` are also persisted bit fields; their complete current assignments live in `packages/otr-core/src/osu/enums.ts`. Add only unused powers of two and test combined values. Do not treat display descriptions as authoritative enum definitions.

## RabbitMQ Contract

Queue constants and TypeScript envelopes live in `packages/otr-core/src/queues/constants.ts` and `packages/otr-core/src/messages/types.ts`.

| Queue                           | Producers                                                | Consumer                            | Payload beside metadata                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data.osu`                      | web procedures and data-worker follow-up/scheduler paths | data-worker osu API worker          | Discriminated union: `{ type: 'beatmap', beatmapId, skipAutomationChecks? }`, `{ type: 'match', osuMatchId, isLazer }`, or `{ type: 'player', osuPlayerId }`. |
| `data.osutrack`                 | web procedures and data-worker player scheduler          | data-worker osu!track worker        | `{ osuPlayerId }`.                                                                                                                                            |
| `processing.checks.tournaments` | web procedures and data-worker completion service        | data-worker automation-check worker | `{ tournamentId, overrideVerifiedState }`.                                                                                                                    |
| `processing.stats.tournaments`  | Rust `otr-processor`                                     | data-worker tournament-stats worker | `{ tournamentId }`.                                                                                                                                           |

Every JSON message is flat:

```json
{
  "requestedAt": "RFC3339 timestamp",
  "correlationId": "string",
  "priority": 5,
  "tournamentId": 123
}
```

TypeScript publishers use the default exchange via `sendToQueue`, durable queues, publisher confirms, persistent delivery, and `x-max-priority=10`. Consumers assert the same durable queue/priority arguments, manually acknowledge success, and normally negative-ack exceptions with requeue enabled.

The stats path is intentionally asymmetric: the Rust publisher declares a durable fanout exchange and a same-named durable queue, binds them, and publishes to that exchange. The TypeScript worker consumes the same-named queue directly. Preserve exchange, queue, binding, routing name, camelCase serialization, top-level metadata, priority, and delivery mode together.

## Verification And Rating Semantics

- Automated checks produce provisional `PreVerified`/`PreRejected` states. `Verified` and `Rejected` are locked final states unless `overrideVerifiedState` is explicitly true.
- Automation treats both provisional and final verified states as valid when evaluating parents. A tournament passes when at least 80% of matches that contain games are pre-verified or verified.
- Manual verification cascades downward only through descendants that are neither already `Verified` nor `Rejected`, clears rejection reasons on changed descendants, and clears match/game warnings. Current helpers continue through rows returned as changed, so final descendants remain untouched.
- Rejection cascades through every descendant, sets final `Rejected`, appends `RejectedTournament`, `RejectedMatch`, or `RejectedGame` with bitwise OR, and clears match/game warnings.
- The processor includes only `verification_status = 4` tournaments and matches, then only status-4 games and scores. It skips a verified game that has fewer than two verified scores. Non-verified scores receive placement `0`; verified scores are ordered by descending score, then ID.
- The processor performs a full rating recomputation. Initial ratings use rank-derived values clamped to `500..2000`, fall back to `1000`, and start at volatility `400`. Mania 4K/7K prefer the player's ManiaOther earliest rank as their seed.
- Match calculations have an absolute rating floor of `100`. Weekly Wednesday 12:00 UTC decay starts at 184 days of inactivity, subtracts `3` per cycle down to a peak-dependent floor of `max(1000, 0.5 * (1000 + peak))`, and increases volatility toward `400`.
- `Decay` and `VolatilityDecay` adjustments have no match ID and are not match performance. The stats worker requires processor-created rating adjustments for each verified match before it replaces `player_match_stats` and `player_tournament_stats`.

## API And Authentication Boundaries

- `/rpc` exposes the full oRPC router. `publicProcedure` provides database access plus optional session/API-key context; `protectedProcedure` requires a Better Auth session.
- `/api` exposes only procedures whose route tags contain `public`. The transport requires `Authorization: Bearer <key>` or `x-api-key`; the latter is normalized to Bearer. `/api/openapi.json` returns the filtered specification.
- Public API security is declared globally as bearer `ApiKeyAuth`. Supplying an invalid or disabled API key to a public procedure fails even though website session authentication is optional.
- `adminMutationProcedure` is `protectedProcedure` plus the Tuesday 11:45-12:15 UTC maintenance guard. It does not prove admin scope by itself. Admin handlers call `ensureAdminSession`, which accepts `admin` or `superadmin` in `session.dbUser.scopes`, and audited writes use `withAuditUserId`.
- Better Auth uses osu! OAuth, session tables, and the API-key plugin. Current API-key ownership is `api_keys.reference_id`; `user_id` is a nullable legacy column.
- The generated OpenAPI `commonSchemas` map is inline inside `generatePublicOpenAPISpec`; it is not exported as a shared library object.

## Common Pitfalls

- The Rust processor does **not** calculate or insert player match/tournament statistics. It publishes `processing.stats.tournaments`; the data worker consumes that queue and writes both statistics tables.
- Processor coupling is not limited to `tournaments`, `matches`, `games`, and `game_scores`; player seed data and all rating/stat output tables listed above are physical contracts too.
- ManiaOther is not currently excluded from Rust rating processing. It is both a seed source for Mania 4K/7K and a processable ruleset when verified ruleset-3 match data exists.
- The actual `RatingAdjustmentType` includes `VolatilityDecay=3`, although the current OpenAPI description string lists only `0..2`. Likewise, the actual `ScoringType` includes `Lazer=4`, which its current description omits.
- A public oRPC procedure is not automatically reachable without credentials through `/api`; the public API transport requires an API key.
- Do not assume a generated migration is editable because it is new to the current branch, or immutable only because it appears in the latest tag. Deployed migration history is immutable; verify both release tags and deployment state.
