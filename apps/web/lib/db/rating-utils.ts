import { sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';

import type { DatabaseClient } from '@/lib/db';
import type { RatingTimestamps } from '@/lib/maintenance-window';

/** Accepts both the database client and a transaction handle. */
export type DbReader = Pick<DatabaseClient, 'select'>;

/**
 * Reads the database clock and the most recent `player_ratings.created`
 * (the last processor run) in one query.
 */
export async function readRatingTimestamps(
  db: DbReader
): Promise<RatingTimestamps> {
  const [row] = await db
    .select({
      nowEpoch: sql<string>`extract(epoch from now())`,
      latestEpoch: sql<
        string | null
      >`extract(epoch from max(${schema.playerRatings.created}))`,
    })
    .from(schema.playerRatings);

  return {
    now: row ? new Date(Number(row.nowEpoch) * 1000) : new Date(),
    latestRatingCreated:
      row?.latestEpoch != null
        ? new Date(Number(row.latestEpoch) * 1000)
        : null,
  };
}
