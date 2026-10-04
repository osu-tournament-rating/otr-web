import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

import * as schema from './schema';

/** A database client or transaction handle that can select. */
export type LatestRatingDb = Pick<
  PgDatabase<PgQueryResultHKT, Record<string, unknown>>,
  'select'
>;

/**
 * The most recent `player_ratings.created`, or null when the table is empty.
 * The processor rebuilds the table in one transaction and every row takes the
 * transaction's start time. This reads every row, as `created` has no index;
 * see `createRatingRecalculationTracker` for how often it runs.
 */
export async function readLatestRatingCreated(
  db: LatestRatingDb
): Promise<Date | null> {
  const [row] = await db
    .select({
      latestEpoch: sql<
        string | null
      >`extract(epoch from max(${schema.playerRatings.created}))`,
    })
    .from(schema.playerRatings);

  return row?.latestEpoch != null
    ? new Date(Number(row.latestEpoch) * 1000)
    : null;
}
