import { eq } from 'drizzle-orm';

import * as schema from './schema';

type QueryLogger = {
  info?: (message: string, context?: Record<string, unknown>) => void;
  warn?: (message: string, context?: Record<string, unknown>) => void;
};

type QueryDb = {
  select: (...args: any[]) => any;
  update: (...args: any[]) => any;
  query: {
    tournaments: {
      findFirst: (args: any) => Promise<
        | {
            startTime: string | null;
            endTime: string | null;
          }
        | null
        | undefined
      >;
    };
  };
};

interface SyncTournamentDateRangeOptions {
  logger?: QueryLogger;
}

const toValidDate = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

export const syncTournamentDateRange = async (
  db: QueryDb,
  tournamentId: number,
  options?: SyncTournamentDateRangeOptions
): Promise<void> => {
  const logger = options?.logger;

  const matchRows: Array<{ startTime: string | null }> = await db
    .select({ startTime: schema.matches.startTime })
    .from(schema.matches)
    .where(eq(schema.matches.tournamentId, tournamentId));

  const sortedDates = matchRows
    .map((row) => toValidDate(row.startTime))
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime());

  const tournament = await db.query.tournaments.findFirst({
    where: eq(schema.tournaments.id, tournamentId),
    columns: {
      startTime: true,
      endTime: true,
    },
  });

  if (!tournament) {
    logger?.warn?.('Attempted to sync date range for unknown tournament', {
      tournamentId,
    });
    return;
  }

  const nowIso = new Date().toISOString();

  if (sortedDates.length === 0) {
    if (tournament.startTime == null && tournament.endTime == null) {
      return;
    }

    await db
      .update(schema.tournaments)
      .set({ startTime: null, endTime: null, updated: nowIso })
      .where(eq(schema.tournaments.id, tournamentId));

    logger?.info?.('Cleared tournament date range because no matches remain', {
      tournamentId,
    });
    return;
  }

  const computedStart = sortedDates[0].toISOString();
  const computedEnd = sortedDates[sortedDates.length - 1].toISOString();

  if (
    tournament.startTime === computedStart &&
    tournament.endTime === computedEnd
  ) {
    return;
  }

  await db
    .update(schema.tournaments)
    .set({
      startTime: computedStart,
      endTime: computedEnd,
      updated: nowIso,
    })
    .where(eq(schema.tournaments.id, tournamentId));

  logger?.info?.('Updated tournament date range from matches', {
    tournamentId,
    startTime: computedStart,
    endTime: computedEnd,
  });
};
