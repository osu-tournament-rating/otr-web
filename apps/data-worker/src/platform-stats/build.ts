import { sql } from 'drizzle-orm';
import type { Ruleset } from '@otr/core/osu';
import {
  PLAYER_STATS_FIRST_PLACE_MINIMUM,
  PLAYER_STATS_LIMITS,
  PLAYER_STATS_MILESTONES,
  PLAYER_STATS_MODS,
  PLAYER_STATS_TEAM_SIZES,
  PLAYER_STATS_UPSET_WINDOWS,
  PLAYER_STATS_WINDOWS,
  PlayerStatsSchema,
  type PlayerStats,
} from '@otr/core/stats/player-stats';

import type { DatabaseClient } from '../db';
import {
  materialiseEligibleScores,
  selectActive,
  selectDuos,
  selectFirstPlace,
  selectLeaders,
  selectMilestones,
  selectModLeaders,
  selectNewcomers,
  selectParticipation,
  selectUpsets,
  type PlayerStatsTransaction,
} from './queries';

/** Ceiling for one statistic so a pathological plan cannot hold the connection indefinitely. */
const STATEMENT_TIMEOUT = '15min';

/**
 * Opens the transaction a snapshot is built in. `repeatable read` is what makes every statistic
 * describe the same instant of the database.
 */
export const withPlayerStatsTransaction = <T>(
  db: DatabaseClient,
  run: (tx: PlayerStatsTransaction) => Promise<T>
): Promise<T> => db.transaction(run, { isolationLevel: 'repeatable read' });

/** Computes one ruleset's snapshot; the caller owns the transaction and what happens to the result. */
export const buildPlayerStats = async (
  tx: PlayerStatsTransaction,
  ruleset: Ruleset,
  now: Date
): Promise<PlayerStats> => {
  await tx.execute(
    sql.raw(`set local statement_timeout = '${STATEMENT_TIMEOUT}'`)
  );
  await materialiseEligibleScores(tx, ruleset);

  const leaders = {
    tournaments: await selectLeaders(tx, {
      ruleset,
      dimension: 'tournaments',
      limit: PLAYER_STATS_LIMITS.leaders,
    }),
    matches: await selectLeaders(tx, {
      ruleset,
      dimension: 'matches',
      limit: PLAYER_STATS_LIMITS.leaders,
    }),
    games: await selectLeaders(tx, {
      ruleset,
      dimension: 'games',
      limit: PLAYER_STATS_LIMITS.leaders,
    }),
  };

  const mods = await selectModLeaders(tx, {
    ruleset,
    mods: PLAYER_STATS_MODS[ruleset],
    limit: PLAYER_STATS_LIMITS.leaders,
  });

  const duos = await selectDuos(tx, {
    ruleset,
    limit: PLAYER_STATS_LIMITS.duos,
  });

  const upsets = await selectUpsets(tx, {
    ruleset,
    now,
    windows: PLAYER_STATS_UPSET_WINDOWS,
    limit: PLAYER_STATS_LIMITS.upsets,
  });

  const firstPlace = await selectFirstPlace(tx, {
    ruleset,
    teamSizes: PLAYER_STATS_TEAM_SIZES,
    minimum: PLAYER_STATS_FIRST_PLACE_MINIMUM,
    limit: PLAYER_STATS_LIMITS.firstPlace,
  });

  const active = await selectActive(tx, {
    ruleset,
    now,
    months: PLAYER_STATS_WINDOWS.activeMonths,
    limit: PLAYER_STATS_LIMITS.active,
  });

  const milestones = await selectMilestones(tx, {
    ruleset,
    now,
    recentDays: PLAYER_STATS_WINDOWS.recentDays,
    milestones: PLAYER_STATS_MILESTONES,
    limit: PLAYER_STATS_LIMITS.milestones,
  });

  const newcomers = await selectNewcomers(tx, {
    ruleset,
    now,
    recentDays: PLAYER_STATS_WINDOWS.recentDays,
    limit: PLAYER_STATS_LIMITS.newcomers,
  });

  const participation = await selectParticipation(tx, { now });

  return PlayerStatsSchema.parse({
    leaders,
    mods,
    duos,
    upsets,
    firstPlace,
    active,
    milestones,
    newcomers,
    participation,
  });
};
