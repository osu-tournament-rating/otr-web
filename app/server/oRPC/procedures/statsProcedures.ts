import { sql, eq } from 'drizzle-orm';

import * as schema from '@/lib/db/schema';
import { publicProcedure } from './base';
import {
  PlatformStatsSchema,
  rulesetKeys,
  verificationStatusKeys,
  RulesetKey,
  VerificationStatusKey,
} from '@/lib/orpc/schema/stats';
import { CHART_CONSTANTS } from '@/lib/utils/chart';
import { VerificationStatus } from '@/lib/osu/enums';

const { BUCKET_SIZE: RATING_BUCKET_SIZE } = CHART_CONSTANTS;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

const createZeroRecord = <T extends readonly string[]>(
  keys: T
): Record<T[number], number> =>
  Object.fromEntries(keys.map((key) => [key, 0])) as Record<T[number], number>;

const parseYear = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getUTCFullYear();
};

export const getPlatformStats = publicProcedure
  .output(PlatformStatsSchema)
  .route({
    summary: 'Get platform statistics',
    tags: ['public'],
    path: '/stats/platform',
  })
  .handler(async ({ context }) => {
    try {
      console.info('[stats] Fetching platform stats');
      const bucketExpression =
        sql<number>`FLOOR(${schema.playerRatings.rating} / ${RATING_BUCKET_SIZE})::int * ${RATING_BUCKET_SIZE}`.as(
          'bucket'
        );

      const ratingBuckets = context.db
        .select({
          ruleset: schema.playerRatings.ruleset,
          bucket: bucketExpression,
        })
        .from(schema.playerRatings)
        .as('rating_buckets');

      const [verificationRows, verifiedTournamentRows, ratingRows] =
        await Promise.all([
          context.db
            .select({
              verificationStatus: schema.tournaments.verificationStatus,
              count: sql<number>`COUNT(*)`,
            })
            .from(schema.tournaments)
            .groupBy(schema.tournaments.verificationStatus),
          context.db
            .select({
              startTime: schema.tournaments.startTime,
              endTime: schema.tournaments.endTime,
              created: schema.tournaments.created,
              ruleset: schema.tournaments.ruleset,
              lobbySize: schema.tournaments.lobbySize,
            })
            .from(schema.tournaments)
            .where(
              eq(
                schema.tournaments.verificationStatus,
                VerificationStatus.Verified
              )
            ),
          context.db
            .select({
              ruleset: ratingBuckets.ruleset,
              bucket: ratingBuckets.bucket,
              count: sql<number>`COUNT(*)`,
            })
            .from(ratingBuckets)
            .groupBy(ratingBuckets.ruleset, ratingBuckets.bucket),
        ]);

      console.info('[stats] Verification rows count', verificationRows.length);
      console.info(
        '[stats] Verified tournament rows count',
        verifiedTournamentRows.length
      );
      console.info('[stats] Rating rows count', ratingRows.length);

      const countByVerificationStatus = createZeroRecord(
        verificationStatusKeys
      );
      let totalCount = 0;

      for (const row of verificationRows) {
        if (
          row.verificationStatus === null ||
          row.verificationStatus === undefined
        ) {
          continue;
        }

        const statusKey = `${row.verificationStatus}` as VerificationStatusKey;
        if (!verificationStatusKeys.includes(statusKey)) {
          console.warn(
            '[stats] Unknown verification status encountered',
            row.verificationStatus
          );
          continue;
        }

        countByVerificationStatus[statusKey] = toNumber(row.count);
        totalCount += toNumber(row.count);
      }

      const verifiedByRuleset = createZeroRecord(rulesetKeys);
      const verifiedByYear: Record<string, number> = {};
      const verifiedByLobbySize: Record<string, number> = {};

      for (const tournament of verifiedTournamentRows) {
        const year =
          parseYear(tournament.startTime) ??
          parseYear(tournament.endTime) ??
          parseYear(tournament.created);

        if (year) {
          const key = `${year}`;
          verifiedByYear[key] = (verifiedByYear[key] ?? 0) + 1;
        }

        const rulesetKey = `${tournament.ruleset}` as RulesetKey;
        if (rulesetKeys.includes(rulesetKey)) {
          verifiedByRuleset[rulesetKey] =
            (verifiedByRuleset[rulesetKey] ?? 0) + 1;
        } else {
          console.warn(
            '[stats] Unknown tournament ruleset',
            tournament.ruleset
          );
        }

        const lobbyKey = `${tournament.lobbySize}`;
        verifiedByLobbySize[lobbyKey] =
          (verifiedByLobbySize[lobbyKey] ?? 0) + 1;
      }

      const ratingsByRuleset = Object.fromEntries(
        rulesetKeys.map((ruleset) => [ruleset, {}])
      ) as Record<RulesetKey, Record<string, number>>;

      for (const row of ratingRows) {
        if (row.ruleset === null || row.ruleset === undefined) {
          console.warn('[stats] Rating row missing ruleset', row);
          continue;
        }

        const rulesetKey = `${row.ruleset}` as RulesetKey;
        if (!rulesetKeys.includes(rulesetKey)) {
          console.warn('[stats] Rating row has unknown ruleset', row.ruleset);
          continue;
        }

        const bucketKey = `${toNumber(row.bucket)}`;

        let record = ratingsByRuleset[rulesetKey];
        if (!record) {
          record = {};
          ratingsByRuleset[rulesetKey] = record;
        }

        record[bucketKey] = toNumber(row.count);
      }

      const sortedVerifiedByYear = Object.fromEntries(
        Object.entries(verifiedByYear).sort(
          ([yearA], [yearB]) => Number(yearA) - Number(yearB)
        )
      );

      const sortedVerifiedByLobbySize = Object.fromEntries(
        Object.entries(verifiedByLobbySize).sort(
          ([sizeA], [sizeB]) => Number(sizeA) - Number(sizeB)
        )
      );

      console.info('[stats] Returning stats payload summary', {
        totalCount,
        verificationKeys: Object.keys(countByVerificationStatus),
        verifiedByYearKeys: Object.keys(sortedVerifiedByYear).length,
        rulesetBuckets: Object.fromEntries(
          Object.entries(ratingsByRuleset).map(([key, value]) => [
            key,
            Object.keys(value).length,
          ])
        ),
      });

      return {
        tournamentStats: {
          totalCount,
          countByVerificationStatus,
          verifiedByYear: sortedVerifiedByYear,
          verifiedByRuleset,
          verifiedByLobbySize: sortedVerifiedByLobbySize,
        },
        ratingStats: {
          ratingsByRuleset,
        },
        userStats: {
          sumByDate: {},
        },
      };
    } catch (error) {
      console.error('[stats] Failed to compute platform stats', error);
      throw error;
    }
  });
