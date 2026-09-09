import { eq, sql } from 'drizzle-orm';
import { platformPlayerStats } from '@otr/core/db/schema';
import type { Ruleset } from '@otr/core/osu';

import type { DatabaseClient } from '../db';
import type { Logger } from '../logging/logger';
import { buildPlayerStats, withPlayerStatsTransaction } from './build';
import type { PlayerStatsTransaction } from './queries';
import {
  formatPlayerStatsSourceKey,
  type PlayerStatsSourceTimestamps,
} from './source-key';

export interface RefreshPlayerStatsOptions {
  db: DatabaseClient;
  ruleset: Ruleset;
  now?: Date;
  /** Rebuilds even when the stored snapshot already describes the current inputs. */
  force?: boolean;
  logger: Logger;
}

export interface RefreshPlayerStatsResult {
  rebuilt: boolean;
  durationMs: number;
}

const readSourceKey = async (
  tx: PlayerStatsTransaction,
  now: Date
): Promise<string> => {
  const { rows } = await tx.execute<PlayerStatsSourceTimestamps>(sql`
    select
      (select max(created) from player_ratings) as "ratingsCreated",
      (select max(created) from player_tournament_stats) as "tournamentStatsCreated",
      (select max(updated) from tournaments) as "tournamentsUpdated",
      (select max(updated) from matches) as "matchesUpdated"
  `);

  return formatPlayerStatsSourceKey(rows[0], now);
};

/**
 * Brings one ruleset's stored snapshot up to date. The read, the build, and the upsert share a
 * single repeatable-read transaction, so a failed build leaves the previous row in place.
 */
export const refreshPlayerStats = async ({
  db,
  ruleset,
  now = new Date(),
  force = false,
  logger,
}: RefreshPlayerStatsOptions): Promise<RefreshPlayerStatsResult> => {
  const startedAt = Date.now();

  const rebuilt = await withPlayerStatsTransaction(db, async (tx) => {
    const sourceKey = await readSourceKey(tx, now);
    const [stored] = await tx
      .select({ sourceKey: platformPlayerStats.sourceKey })
      .from(platformPlayerStats)
      .where(eq(platformPlayerStats.ruleset, ruleset));

    if (!force && stored?.sourceKey === sourceKey) {
      logger.debug('Player statistics are already current', { ruleset });
      return false;
    }

    const payload = await buildPlayerStats(tx, ruleset, now);
    const generatedAt = now.toISOString();

    await tx
      .insert(platformPlayerStats)
      .values({ ruleset, generatedAt, sourceKey, payload })
      .onConflictDoUpdate({
        target: platformPlayerStats.ruleset,
        set: { generatedAt, sourceKey, payload },
      });

    return true;
  });

  return { rebuilt, durationMs: Date.now() - startedAt };
};
