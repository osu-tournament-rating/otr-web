import type { UserStatUpdate } from '@otr/core';
import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { Ruleset, VerificationStatus } from '@otr/core/osu';
import { and, asc, eq, isNotNull } from 'drizzle-orm';

import type { DatabaseClient } from '../db';
import type { Logger } from '../logging/logger';

const MODE_RULESET_MAP: Record<number, Ruleset | undefined> = {
  0: Ruleset.Osu,
  1: Ruleset.Taiko,
  2: Ruleset.Catch,
  3: Ruleset.ManiaOther,
};

const MANIA_VARIANTS: Ruleset[] = [Ruleset.Mania4k, Ruleset.Mania7k];

type ModeResult = {
  mode: number;
  updates: UserStatUpdate[];
};

type RulesetDataRow = typeof schema.playerOsuRulesetData.$inferSelect & {
  ruleset: number;
};

type RulesetDataMap = Map<number, RulesetDataRow>;

interface ProcessPlayerResultsOptions {
  db: DatabaseClient;
  logger: Logger;
  osuPlayerId: number;
  results: ModeResult[];
}

export const processOsuTrackPlayerResults = async ({
  db,
  logger,
  osuPlayerId,
  results,
}: ProcessPlayerResultsOptions) => {
  if (results.length === 0) {
    return;
  }

  const player = await db.query.players.findFirst({
    where: eq(schema.players.osuId, osuPlayerId),
    columns: {
      id: true,
      username: true,
    },
    with: {
      playerOsuRulesetData: true,
    },
  });

  if (!player) {
    logger.warn('Player not found for osu!track fetch', { osuPlayerId });
    return;
  }

  logger.info(
    `osu!track persistence start player ${player.username}#${player.id} (${osuPlayerId})`
  );

  const earliestVerifiedMatchDate = await findEarliestVerifiedMatchDate(
    db,
    player.id
  );

  if (earliestVerifiedMatchDate) {
    logger.info(
      `osu!track alignment using earliest verified match ${earliestVerifiedMatchDate.toISOString()} for player ${player.id}`
    );
  } else {
    logger.info(
      `osu!track alignment found no verified matches for player ${player.id}`
    );
  }

  const rulesetDataMap: RulesetDataMap = new Map(
    player.playerOsuRulesetData.map((entry) => [entry.ruleset, entry])
  );

  const nowIso = new Date().toISOString();
  let persistedAny = false;

  for (const { mode, updates } of results) {
    const ruleset = MODE_RULESET_MAP[mode];

    if (ruleset === undefined) {
      logger.warn('Skipping unknown osu!track mode', { mode, osuPlayerId });
      continue;
    }

    if (updates.length === 0) {
      logger.info(
        `osu!track persistence no updates for player ${player.id} mode ${mode}`
      );
      continue;
    }

    const relevant = pickRelevantStatUpdate(updates, earliestVerifiedMatchDate);

    if (!relevant) {
      logger.info(
        `osu!track persistence no relevant stat for player ${player.id} mode ${mode}`
      );
      continue;
    }

    const rulesetData = rulesetDataMap.get(ruleset);

    if (!rulesetData) {
      logger.info(
        `osu!track persistence missing ruleset ${ruleset} for player ${player.id}`
      );
      continue;
    }

    const timestampIso = relevant.timestamp.toISOString();

    await db
      .update(schema.playerOsuRulesetData)
      .set({
        earliestGlobalRank: relevant.rank,
        earliestGlobalRankDate: timestampIso,
        updated: nowIso,
      })
      .where(eq(schema.playerOsuRulesetData.id, rulesetData.id));

    rulesetData.earliestGlobalRank = relevant.rank;
    rulesetData.earliestGlobalRankDate = timestampIso;
    persistedAny = true;

    logger.info(
      `osu!track persistence recorded rank ${relevant.rank} (${timestampIso}) for player ${player.id} ruleset ${ruleset}`
    );

    if (ruleset === Ruleset.ManiaOther) {
      const maniaPersisted = await propagateManiaVariants(
        db,
        logger,
        rulesetDataMap,
        relevant,
        nowIso,
        player.id
      );
      persistedAny = persistedAny || maniaPersisted;
    }
  }

  // Always update osuTrackLastFetch and status to mark this player as fetched,
  // even when no updates were persisted
  await db
    .update(schema.players)
    .set({
      osuTrackLastFetch: nowIso,
      osuTrackDataFetchStatus: DataFetchStatus.Fetched,
    })
    .where(eq(schema.players.id, player.id));

  if (persistedAny) {
    logger.info(
      `osu!track persistence finished player ${player.id}, set last fetch ${nowIso}`
    );
  } else {
    logger.info(
      `osu!track persistence finished player ${player.id}, no ruleset rows updated, set last fetch ${nowIso}`
    );
  }
};

const propagateManiaVariants = async (
  db: DatabaseClient,
  logger: Logger,
  rulesetDataMap: RulesetDataMap,
  source: UserStatUpdate,
  updatedAtIso: string,
  playerId: number
): Promise<boolean> => {
  const timestampIso = source.timestamp.toISOString();
  let updatedAny = false;

  for (const variant of MANIA_VARIANTS) {
    const variantData = rulesetDataMap.get(variant);

    if (!variantData) {
      logger.warn(
        `osu!track persistence missing mania variant ${variant} for player ${playerId}`
      );
      continue;
    }

    await db
      .update(schema.playerOsuRulesetData)
      .set({
        earliestGlobalRank: source.rank,
        earliestGlobalRankDate: timestampIso,
        updated: updatedAtIso,
      })
      .where(eq(schema.playerOsuRulesetData.id, variantData.id));

    variantData.earliestGlobalRank = source.rank;
    variantData.earliestGlobalRankDate = timestampIso;
    updatedAny = true;

    logger.info(
      `osu!track persistence copied rank ${source.rank} (${timestampIso}) to mania variant ${variant} for player ${playerId}`
    );
  }
  return updatedAny;
};

export const pickRelevantStatUpdate = (
  updates: UserStatUpdate[],
  earliestMatchDate: Date | null
): UserStatUpdate | null => {
  if (updates.length === 0) {
    return null;
  }

  const sorted = [...updates];

  if (!earliestMatchDate) {
    sorted.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return sorted[0] ?? null;
  }

  const target = earliestMatchDate.getTime();

  sorted.sort((a, b) => {
    const diffA = Math.abs(a.timestamp.getTime() - target);
    const diffB = Math.abs(b.timestamp.getTime() - target);
    return diffA - diffB;
  });

  return sorted[0] ?? null;
};

const findEarliestVerifiedMatchDate = async (
  db: DatabaseClient,
  playerId: number
): Promise<Date | null> => {
  const [row] = await db
    .select({ startTime: schema.matches.startTime })
    .from(schema.gameScores)
    .innerJoin(schema.games, eq(schema.games.id, schema.gameScores.gameId))
    .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
    .innerJoin(
      schema.tournaments,
      eq(schema.tournaments.id, schema.matches.tournamentId)
    )
    .where(
      and(
        eq(schema.gameScores.playerId, playerId),
        eq(schema.matches.verificationStatus, VerificationStatus.Verified),
        eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
        isNotNull(schema.matches.startTime)
      )
    )
    .orderBy(asc(schema.matches.startTime))
    .limit(1);

  if (!row?.startTime) {
    return null;
  }

  const parsed = new Date(row.startTime);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};
