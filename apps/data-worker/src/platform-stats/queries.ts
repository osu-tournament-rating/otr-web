import { sql, type SQL } from 'drizzle-orm';
import {
  Mods,
  RatingAdjustmentType,
  Ruleset,
  Team,
  VerificationStatus,
} from '@otr/core/osu';
import type {
  PlayerStats,
  PlayerStatsActive,
  PlayerStatsDuo,
  PlayerStatsFirstPlace,
  PlayerStatsLeader,
  PlayerStatsMilestone,
  PlayerStatsNewcomer,
  PlayerStatsPlayer,
  PlayerStatsTeamSize,
  PlayerStatsUpset,
  PlayerStatsUpsetWindow,
} from '@otr/core/stats/player-stats';

import type { DatabaseClient } from '../db';

export type PlayerStatsTransaction = Parameters<
  Parameters<DatabaseClient['transaction']>[0]
>[0];

export type PlayerStatsLeaderDimension = keyof PlayerStats['leaders'];

/** Per-build temp table holding one row per eligible score; see `materialiseEligibleScores`. */
const SOURCE = sql.raw('platform_stats_eligible_scores');

const toIso = (value: Date | string): string => new Date(value).toISOString();

/** Nightcore is stored as its own bit; mod specialist counts treat it as DoubleTime. */
const modMask = (mod: Mods): number =>
  mod === Mods.DoubleTime ? Mods.DoubleTime | Mods.Nightcore : mod;

const list = (values: readonly (number | string)[]): SQL =>
  sql.join(
    values.map((value) => sql`${value}`),
    sql`, `
  );

/** Player projection for every named row; shaped like `PlayerStatsPlayerSchema`. */
const playerJson = (player: string, rating: string): SQL =>
  sql.raw(
    `jsonb_build_object('id', ${player}.id, 'osuId', ${player}.osu_id, ` +
      `'username', ${player}.username, 'country', ${player}.country, ` +
      `'rating', ${rating}.rating)`
  );

/** Names a player: restricted players drop out of the list and the ruleset rating is attached. */
const namedPlayerJoin = (
  ruleset: Ruleset,
  playerId: SQL,
  player: string,
  rating: string
): SQL => {
  const p = sql.raw(player);
  const r = sql.raw(rating);

  return sql`
    join players ${p} on ${p}.id = ${playerId} and ${p}.osu_restricted = false
    left join player_ratings ${r} on ${r}.player_id = ${p}.id and ${r}.ruleset = ${ruleset}`;
};

const monthsBefore = (now: Date, months: number): SQL =>
  sql`${now}::timestamptz - make_interval(months => ${months})`;

const daysBefore = (now: Date, days: number): SQL =>
  sql`${now}::timestamptz - make_interval(days => ${days})`;

/**
 * Creates the transaction-local source every statistic reads: one row per verified score of a
 * verified game, match, and tournament in `ruleset`. Dropped when the transaction ends.
 */
export const materialiseEligibleScores = async (
  tx: PlayerStatsTransaction,
  ruleset: Ruleset
): Promise<void> => {
  await tx.execute(sql`
    create temp table ${SOURCE} (
      player_id integer not null,
      game_id integer not null,
      match_id integer not null,
      tournament_id integer not null,
      team integer not null,
      score integer not null,
      mods integer not null,
      start_time timestamptz not null,
      match_time timestamptz not null,
      lobby_size integer not null
    ) on commit drop
  `);

  await tx.execute(sql`
    insert into ${SOURCE}
    select
      s.player_id,
      s.game_id,
      g.match_id,
      m.tournament_id,
      s.team,
      s.score,
      s.mods | g.mods,
      g.start_time,
      coalesce(m.start_time, g.start_time),
      t.lobby_size
    from game_scores s
    join games g on g.id = s.game_id
    join matches m on m.id = g.match_id
    join tournaments t on t.id = m.tournament_id
    where s.verification_status = ${VerificationStatus.Verified}
      and g.verification_status = ${VerificationStatus.Verified}
      and m.verification_status = ${VerificationStatus.Verified}
      and t.verification_status = ${VerificationStatus.Verified}
      and t.ruleset = ${ruleset}
  `);

  await tx.execute(sql`create index on ${SOURCE} (game_id)`);
  await tx.execute(sql`create index on ${SOURCE} (player_id)`);
  await tx.execute(sql`create index on ${SOURCE} (match_id)`);
  await tx.execute(sql`analyze ${SOURCE}`);
};

const LEADER_DIMENSION: Record<PlayerStatsLeaderDimension, SQL> = {
  tournaments: sql`tournament_id`,
  matches: sql`match_id`,
  games: sql`game_id`,
};

export const selectLeaders = async (
  tx: PlayerStatsTransaction,
  options: {
    ruleset: Ruleset;
    dimension: PlayerStatsLeaderDimension;
    limit: number;
  }
): Promise<PlayerStatsLeader[]> => {
  const { rows } = await tx.execute<{
    player: PlayerStatsPlayer;
    value: number;
  }>(sql`
    with totals as (
      select player_id, count(distinct ${LEADER_DIMENSION[options.dimension]})::int as value
      from ${SOURCE}
      group by player_id
    )
    select ${playerJson('p', 'r')} as player, totals.value
    from totals
    ${namedPlayerJoin(options.ruleset, sql`totals.player_id`, 'p', 'r')}
    order by totals.value desc, p.id asc
    limit ${options.limit}
  `);

  return rows.map((row) => ({ ...row.player, value: row.value }));
};

export const selectModLeaders = async (
  tx: PlayerStatsTransaction,
  options: { ruleset: Ruleset; mods: readonly Mods[]; limit: number }
): Promise<PlayerStats['mods']> => {
  if (options.mods.length === 0) {
    return [];
  }

  const masks = sql.join(
    options.mods.map(
      (mod, ordinal) =>
        sql`(${ordinal}::int, ${mod}::int, ${modMask(mod)}::int)`
    ),
    sql`, `
  );

  const { rows } = await tx.execute<{
    ordinal: number;
    mods: number;
    value: number;
    player: PlayerStatsPlayer;
  }>(sql`
    with masks (ordinal, mods, mask) as (values ${masks}),
    totals as (
      select k.ordinal, k.mods, e.player_id, count(*)::int as value
      from ${SOURCE} e
      join masks k on (e.mods & k.mask) <> 0
      group by k.ordinal, k.mods, e.player_id
    ),
    ranked as (
      select t.ordinal, t.mods, t.value, ${playerJson('p', 'r')} as player,
        row_number() over (partition by t.ordinal order by t.value desc, p.id asc) as rank
      from totals t
      ${namedPlayerJoin(options.ruleset, sql`t.player_id`, 'p', 'r')}
    )
    select ordinal, mods, value, player
    from ranked
    where rank <= ${options.limit}
    order by ordinal, rank
  `);

  return options.mods.map((mod, ordinal) => ({
    mods: mod,
    leaders: rows
      .filter((row) => row.ordinal === ordinal)
      .map((row) => ({ ...row.player, value: row.value })),
  }));
};

export const selectDuos = async (
  tx: PlayerStatsTransaction,
  options: { ruleset: Ruleset; limit: number }
): Promise<PlayerStatsDuo[]> => {
  const { rows } = await tx.execute<{
    playerA: PlayerStatsPlayer;
    playerB: PlayerStatsPlayer;
    games: number;
    matches: number;
    tournaments: number;
    firstGame: Date;
    lastGame: Date;
  }>(sql`
    with pairs as (
      select a.player_id as first_id, b.player_id as second_id,
        a.match_id, a.tournament_id, a.start_time
      from ${SOURCE} a
      join ${SOURCE} b
        on b.game_id = a.game_id and b.team = a.team and b.player_id > a.player_id
      where a.team in (${Team.Blue}, ${Team.Red})
    ),
    totals as (
      select first_id, second_id,
        count(*)::int as games,
        count(distinct match_id)::int as matches,
        count(distinct tournament_id)::int as tournaments,
        min(start_time) as first_game,
        max(start_time) as last_game
      from pairs
      group by first_id, second_id
    )
    select ${playerJson('pa', 'ra')} as "playerA", ${playerJson('pb', 'rb')} as "playerB",
      totals.games, totals.matches, totals.tournaments,
      totals.first_game as "firstGame", totals.last_game as "lastGame"
    from totals
    ${namedPlayerJoin(options.ruleset, sql`totals.first_id`, 'pa', 'ra')}
    ${namedPlayerJoin(options.ruleset, sql`totals.second_id`, 'pb', 'rb')}
    order by totals.games desc, totals.matches desc, pa.id asc, pb.id asc
    limit ${options.limit}
  `);

  return rows.map((row) => ({
    players: [row.playerA, row.playerB],
    games: row.games,
    matches: row.matches,
    tournaments: row.tournaments,
    firstGame: toIso(row.firstGame),
    lastGame: toIso(row.lastGame),
  }));
};

export const selectUpsets = async (
  tx: PlayerStatsTransaction,
  options: {
    ruleset: Ruleset;
    now: Date;
    windows: readonly PlayerStatsUpsetWindow[];
    limit: number;
  }
): Promise<Record<PlayerStatsUpsetWindow, PlayerStatsUpset[]>> => {
  const windows = sql.join(
    options.windows.map(
      (key) =>
        sql`(${key}::text, ${
          key === 'all'
            ? sql`null::timestamptz`
            : monthsBefore(options.now, Number(key))
        })`
    ),
    sql`, `
  );

  const { rows } = await tx.execute<{
    key: PlayerStatsUpsetWindow;
    matchId: number;
    date: Date;
    gap: number;
    winner: PlayerStatsUpset['winner'];
    loser: PlayerStatsUpset['loser'];
    tournament: PlayerStatsUpset['tournament'];
  }>(sql`
    with candidates as (
      select match_id, min(tournament_id) as tournament_id, min(match_time) as match_time
      from ${SOURCE}
      where lobby_size = 1
      group by match_id
      having count(distinct player_id) = 2
    ),
    duel_scores as (
      select e.match_id, e.game_id, e.player_id, e.score
      from ${SOURCE} e
      join candidates c on c.match_id = e.match_id
    ),
    game_winner as (
      select match_id, game_id,
        case when count(*) filter (where score = best) = 1
          then min(player_id) filter (where score = best) end as player_id
      from (
        select d.*, max(d.score) over (partition by d.game_id) as best
        from duel_scores d
      ) ranked
      group by match_id, game_id
    ),
    game_wins as (
      select match_id, player_id, count(*)::int as wins
      from game_winner
      where player_id is not null
      group by match_id, player_id
    ),
    duel_players as (
      select distinct match_id, player_id from duel_scores
    ),
    tallies as (
      select p.match_id, p.player_id, coalesce(w.wins, 0) as wins
      from duel_players p
      left join game_wins w on w.match_id = p.match_id and w.player_id = p.player_id
    ),
    decided as (
      select match_id,
        (array_agg(player_id order by wins desc, player_id))[1] as winner_id,
        (array_agg(player_id order by wins desc, player_id))[2] as loser_id,
        (array_agg(wins order by wins desc, player_id))[1] as top_wins,
        (array_agg(wins order by wins desc, player_id))[2] as runner_up_wins
      from tallies
      group by match_id
    ),
    upsets as (
      select d.match_id, c.tournament_id, c.match_time,
        d.winner_id, d.loser_id,
        wa.rating_before as winner_rating,
        la.rating_before as loser_rating
      from decided d
      join candidates c on c.match_id = d.match_id
      join rating_adjustments wa
        on wa.match_id = d.match_id and wa.player_id = d.winner_id
        and wa.adjustment_type = ${RatingAdjustmentType.Match} and wa.ruleset = ${options.ruleset}
      join rating_adjustments la
        on la.match_id = d.match_id and la.player_id = d.loser_id
        and la.adjustment_type = ${RatingAdjustmentType.Match} and la.ruleset = ${options.ruleset}
      where d.top_wins > d.runner_up_wins
        and wa.rating_before < la.rating_before
    ),
    named as materialized (
      select u.match_id, u.match_time, (u.loser_rating - u.winner_rating) as gap,
        pw.id as winner_player_id,
        ${playerJson('pw', 'rw')} || jsonb_build_object('ratingBefore', u.winner_rating) as winner,
        ${playerJson('pl', 'rl')} || jsonb_build_object('ratingBefore', u.loser_rating) as loser,
        jsonb_build_object('id', t.id, 'name', t.name, 'abbreviation', t.abbreviation) as tournament
      from upsets u
      join tournaments t on t.id = u.tournament_id
      ${namedPlayerJoin(options.ruleset, sql`u.winner_id`, 'pw', 'rw')}
      ${namedPlayerJoin(options.ruleset, sql`u.loser_id`, 'pl', 'rl')}
    )
    select w.key, n.match_id as "matchId", n.match_time as date, n.gap,
      n.winner, n.loser, n.tournament
    from (values ${windows}) as w (key, cutoff)
    join lateral (
      select *
      from named
      where w.cutoff is null or named.match_time >= w.cutoff
      order by named.gap desc, named.winner_player_id asc, named.match_id asc
      limit ${options.limit}
    ) n on true
  `);

  return Object.fromEntries(
    options.windows.map((key) => [
      key,
      rows
        .filter((row) => row.key === key)
        .map((row) => ({
          matchId: row.matchId,
          tournament: row.tournament,
          date: toIso(row.date),
          winner: row.winner,
          loser: row.loser,
          gap: row.gap,
        })),
    ])
  ) as Record<PlayerStatsUpsetWindow, PlayerStatsUpset[]>;
};

export const selectFirstPlace = async (
  tx: PlayerStatsTransaction,
  options: {
    ruleset: Ruleset;
    teamSizes: readonly PlayerStatsTeamSize[];
    minimum: { games: number; matches: number };
    limit: number;
  }
): Promise<Record<PlayerStatsTeamSize, PlayerStatsFirstPlace[]>> => {
  const { rows } = await tx.execute<{
    key: PlayerStatsTeamSize;
    wins: number;
    games: number;
    player: PlayerStatsPlayer;
  }>(sql`
    with best as (
      select game_id, max(score) as score from ${SOURCE} group by game_id
    ),
    marked as (
      select e.player_id, e.match_id, e.lobby_size, e.score = b.score as won
      from ${SOURCE} e
      join best b on b.game_id = e.game_id
    ),
    totals as (
      select
        case when grouping(lobby_size) = 1 then 'all' else lobby_size::text end as key,
        player_id,
        count(*)::int as games,
        count(*) filter (where won)::int as wins,
        count(distinct match_id)::int as matches
      from marked
      group by grouping sets ((player_id), (player_id, lobby_size))
    ),
    ranked as (
      select t.key, t.games, t.wins, ${playerJson('p', 'r')} as player,
        row_number() over (
          partition by t.key
          order by t.wins::float8 / t.games desc, t.games desc, p.id asc
        ) as rank
      from totals t
      ${namedPlayerJoin(options.ruleset, sql`t.player_id`, 'p', 'r')}
      where t.key in (${list(options.teamSizes)})
        and t.games >= ${options.minimum.games}
        and t.matches >= ${options.minimum.matches}
    )
    select key, games, wins, player
    from ranked
    where rank <= ${options.limit}
    order by key, rank
  `);

  return Object.fromEntries(
    options.teamSizes.map((key) => [
      key,
      rows
        .filter((row) => row.key === key)
        .map((row) => ({ ...row.player, wins: row.wins, games: row.games })),
    ])
  ) as Record<PlayerStatsTeamSize, PlayerStatsFirstPlace[]>;
};

export const selectActive = async (
  tx: PlayerStatsTransaction,
  options: { ruleset: Ruleset; now: Date; months: number; limit: number }
): Promise<PlayerStatsActive[]> => {
  const { rows } = await tx.execute<{
    player: PlayerStatsPlayer;
    matches: number;
    tournaments: number;
  }>(sql`
    with totals as (
      select player_id,
        count(distinct match_id)::int as matches,
        count(distinct tournament_id)::int as tournaments
      from ${SOURCE}
      where match_time >= ${monthsBefore(options.now, options.months)}
      group by player_id
    )
    select ${playerJson('p', 'r')} as player, totals.matches, totals.tournaments
    from totals
    ${namedPlayerJoin(options.ruleset, sql`totals.player_id`, 'p', 'r')}
    order by totals.matches desc, totals.tournaments desc, p.id asc
    limit ${options.limit}
  `);

  return rows.map((row) => ({
    ...row.player,
    matches: row.matches,
    tournaments: row.tournaments,
  }));
};

export const selectMilestones = async (
  tx: PlayerStatsTransaction,
  options: {
    ruleset: Ruleset;
    now: Date;
    recentDays: number;
    milestones: readonly number[];
    limit: number;
  }
): Promise<PlayerStatsMilestone[]> => {
  const counts = list(options.milestones);

  const { rows } = await tx.execute<{
    player: PlayerStatsPlayer;
    kind: PlayerStatsMilestone['kind'];
    count: number;
    date: Date;
    matchId: number;
  }>(sql`
    with cutoff as (select ${daysBefore(options.now, options.recentDays)} as at),
    recent_players as (
      select distinct e.player_id
      from ${SOURCE} e
      cross join cutoff c
      where e.match_time >= c.at or e.start_time >= c.at
    ),
    player_matches as (
      select e.player_id, e.match_id,
        min(e.tournament_id) as tournament_id,
        min(e.match_time) as match_time
      from ${SOURCE} e
      join recent_players rp on rp.player_id = e.player_id
      group by e.player_id, e.match_id
    ),
    match_milestones as (
      select player_id, 'matches'::text as kind, n, match_time as date, match_id
      from (
        select player_id, match_id, match_time,
          row_number() over (partition by player_id order by match_time, match_id) as n
        from player_matches
      ) ranked
      where n in (${counts})
    ),
    tournament_debuts as (
      select distinct on (player_id, tournament_id)
        player_id, tournament_id, match_id, match_time
      from player_matches
      order by player_id, tournament_id, match_time, match_id
    ),
    tournament_milestones as (
      select player_id, 'tournaments'::text as kind, n, match_time as date, match_id
      from (
        select player_id, match_id, match_time,
          row_number() over (partition by player_id order by match_time, tournament_id) as n
        from tournament_debuts
      ) ranked
      where n in (${counts})
    ),
    game_milestones as (
      select player_id, 'games'::text as kind, n, start_time as date, match_id
      from (
        select e.player_id, e.match_id, e.start_time,
          row_number() over (partition by e.player_id order by e.start_time, e.game_id) as n
        from ${SOURCE} e
        join recent_players rp on rp.player_id = e.player_id
      ) ranked
      where n in (${counts})
    ),
    reached as (
      select * from match_milestones
      union all select * from tournament_milestones
      union all select * from game_milestones
    )
    select ${playerJson('p', 'r')} as player, m.kind, m.n::int as count,
      m.date, m.match_id as "matchId"
    from reached m
    cross join cutoff c
    ${namedPlayerJoin(options.ruleset, sql`m.player_id`, 'p', 'r')}
    where m.date >= c.at
    order by m.date desc, m.n desc, p.id asc, m.kind asc
    limit ${options.limit}
  `);

  return rows.map((row) => ({
    ...row.player,
    kind: row.kind,
    count: row.count,
    date: toIso(row.date),
    matchId: row.matchId,
  }));
};

export const selectNewcomers = async (
  tx: PlayerStatsTransaction,
  options: {
    ruleset: Ruleset;
    now: Date;
    recentDays: number;
    limit: number;
  }
): Promise<PlayerStatsNewcomer[]> => {
  const { rows } = await tx.execute<{
    player: PlayerStatsPlayer;
    firstMatch: Date;
    matchId: number;
    wins: number;
    losses: number;
    osuGlobalRank: number | null;
  }>(sql`
    with cutoff as (select ${daysBefore(options.now, options.recentDays)} as at),
    debuts as (
      select distinct on (player_id) player_id, match_id, match_time
      from ${SOURCE}
      order by player_id, match_time, match_id
    ),
    newcomers as (
      select d.player_id, d.match_id, d.match_time
      from debuts d
      cross join cutoff c
      where d.match_time >= c.at
    ),
    newcomer_rows as (
      select e.player_id, e.match_id, e.team
      from ${SOURCE} e
      join newcomers n on n.player_id = e.player_id
    ),
    contested as (
      select distinct match_id from newcomer_rows
    ),
    game_teams as (
      select e.match_id, e.game_id, e.team, sum(e.score) as total
      from ${SOURCE} e
      join contested x on x.match_id = e.match_id
      group by e.match_id, e.game_id, e.team
    ),
    game_winner as (
      select match_id, game_id,
        case when count(*) filter (where total = best) = 1
          then min(team) filter (where total = best) end as team
      from (
        select g.*, max(g.total) over (partition by g.game_id) as best
        from game_teams g
      ) ranked
      group by match_id, game_id
    ),
    match_team_wins as (
      select match_id, team, count(*) as wins,
        max(count(*)) over (partition by match_id) as best
      from game_winner
      where team is not null
      group by match_id, team
    ),
    match_winner as (
      select match_id,
        case when count(*) filter (where wins = best) = 1
          then min(team) filter (where wins = best) end as team
      from match_team_wins
      group by match_id
    ),
    player_teams as (
      select player_id, match_id, min(team) as team
      from newcomer_rows
      group by player_id, match_id
    ),
    records as (
      select t.player_id,
        count(*) filter (where w.team is not null and w.team = t.team)::int as wins,
        count(*) filter (where w.team is not null and w.team <> t.team)::int as losses
      from player_teams t
      left join match_winner w on w.match_id = t.match_id
      group by t.player_id
    )
    select ${playerJson('p', 'r')} as player,
      n.match_time as "firstMatch", n.match_id as "matchId",
      rec.wins, rec.losses, o.global_rank as "osuGlobalRank"
    from newcomers n
    join records rec on rec.player_id = n.player_id
    ${namedPlayerJoin(options.ruleset, sql`n.player_id`, 'p', 'r')}
    left join player_osu_ruleset_data o
      on o.player_id = p.id and o.ruleset = ${options.ruleset}
    order by n.match_time desc, o.global_rank asc nulls last, p.id asc
    limit ${options.limit}
  `);

  return rows.map((row) => ({
    ...row.player,
    firstMatch: toIso(row.firstMatch),
    matchId: row.matchId,
    wins: row.wins,
    losses: row.losses,
    osuGlobalRank: row.osuGlobalRank,
  }));
};

export const selectParticipation = async (
  tx: PlayerStatsTransaction,
  options: { now: Date }
): Promise<PlayerStats['participation']> => {
  const { rows } = await tx.execute<{ month: string; players: number }>(sql`
    with bounds as (
      select date_trunc('month', min(match_time) at time zone 'UTC') as first_month
      from ${SOURCE}
    ),
    months as (
      select generate_series(
        b.first_month,
        date_trunc('month', ${options.now}::timestamptz at time zone 'UTC'),
        interval '1 month'
      ) as month
      from bounds b
      where b.first_month is not null
    ),
    totals as (
      select date_trunc('month', match_time at time zone 'UTC') as month,
        count(distinct player_id)::int as players
      from ${SOURCE}
      group by 1
    )
    select to_char(m.month, 'YYYY-MM') as month, coalesce(t.players, 0) as players
    from months m
    left join totals t on t.month = m.month
    order by m.month
  `);

  return rows;
};
