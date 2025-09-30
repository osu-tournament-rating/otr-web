import { eq, inArray } from 'drizzle-orm';

import type { DatabaseClient } from '../../db';
import type { Logger } from '../../logging/logger';
import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';

interface TournamentDataCompletionServiceOptions {
  db: DatabaseClient;
  logger: Logger;
  publishAutomationCheck?: (options: {
    tournamentId: number;
    overrideVerifiedState: boolean;
  }) => Promise<void>;
}

export class TournamentDataCompletionService {
  private readonly db: DatabaseClient;
  private readonly logger: Logger;
  private readonly publishAutomationCheck?: (options: {
    tournamentId: number;
    overrideVerifiedState: boolean;
  }) => Promise<void>;

  private readonly pendingAutomation = new Set<number>();

  constructor(options: TournamentDataCompletionServiceOptions) {
    this.db = options.db;
    this.logger = options.logger;
    this.publishAutomationCheck = options.publishAutomationCheck;
  }

  async updateMatchFetchStatus(matchId: number, status: number): Promise<void> {
    const match = await this.db.query.matches.findFirst({
      where: eq(schema.matches.id, matchId),
      columns: {
        id: true,
        tournamentId: true,
      },
    });

    if (!match) {
      this.logger.warn('Attempted to update fetch status for unknown match', {
        matchId,
      });
      return;
    }

    await this.db
      .update(schema.matches)
      .set({ dataFetchStatus: status })
      .where(eq(schema.matches.id, matchId));

    if (match.tournamentId) {
      await this.checkAndTriggerAutomationChecksIfComplete(match.tournamentId);
    }
  }

  async updateBeatmapFetchStatus(
    beatmapId: number,
    status: number
  ): Promise<void> {
    const beatmap = await this.db.query.beatmaps.findFirst({
      where: eq(schema.beatmaps.id, beatmapId),
      columns: {
        id: true,
      },
    });

    if (!beatmap) {
      this.logger.warn('Attempted to update fetch status for unknown beatmap', {
        beatmapId,
      });
      return;
    }

    await this.db
      .update(schema.beatmaps)
      .set({ dataFetchStatus: status })
      .where(eq(schema.beatmaps.id, beatmapId));

    const pooledTournamentRows = await this.db
      .select({ tournamentId: schema.joinPooledBeatmaps.tournamentsPooledInId })
      .from(schema.joinPooledBeatmaps)
      .where(eq(schema.joinPooledBeatmaps.pooledBeatmapsId, beatmapId));

    const gameTournamentRows = await this.db
      .select({ tournamentId: schema.matches.tournamentId })
      .from(schema.games)
      .innerJoin(schema.matches, eq(schema.games.matchId, schema.matches.id))
      .where(eq(schema.games.beatmapId, beatmapId));

    const tournamentIds = new Set<number>();
    pooledTournamentRows.forEach(
      (row) => row.tournamentId != null && tournamentIds.add(row.tournamentId)
    );
    gameTournamentRows.forEach(
      (row) => row.tournamentId != null && tournamentIds.add(row.tournamentId)
    );

    for (const id of tournamentIds) {
      await this.checkAndTriggerAutomationChecksIfComplete(id);
    }
  }

  async checkAndTriggerAutomationChecksIfComplete(
    tournamentId: number
  ): Promise<boolean> {
    if (this.pendingAutomation.has(tournamentId)) {
      return false;
    }

    const matches = await this.db
      .select({
        id: schema.matches.id,
        dataFetchStatus: schema.matches.dataFetchStatus,
      })
      .from(schema.matches)
      .where(eq(schema.matches.tournamentId, tournamentId));

    if (matches.length === 0) {
      return false;
    }

    const matchesComplete = matches.every(
      (match) =>
        match.dataFetchStatus === DataFetchStatus.Fetched ||
        match.dataFetchStatus === DataFetchStatus.NotFound
    );

    if (!matchesComplete) {
      return false;
    }

    await this.syncTournamentDateRangeFromMatches(tournamentId);

    const pooledBeatmapIds = await this.db
      .select({ beatmapId: schema.joinPooledBeatmaps.pooledBeatmapsId })
      .from(schema.joinPooledBeatmaps)
      .where(eq(schema.joinPooledBeatmaps.tournamentsPooledInId, tournamentId));

    const gameBeatmapIds = await this.db
      .select({ beatmapId: schema.games.beatmapId })
      .from(schema.games)
      .innerJoin(schema.matches, eq(schema.games.matchId, schema.matches.id))
      .where(eq(schema.matches.tournamentId, tournamentId));

    const beatmapIdSet = new Set<number>();
    for (const row of pooledBeatmapIds) {
      if (row.beatmapId != null) {
        beatmapIdSet.add(row.beatmapId);
      }
    }
    for (const row of gameBeatmapIds) {
      if (row.beatmapId != null) {
        beatmapIdSet.add(row.beatmapId);
      }
    }

    if (beatmapIdSet.size > 0) {
      const beatmapStatuses = await this.db
        .select({ dataFetchStatus: schema.beatmaps.dataFetchStatus })
        .from(schema.beatmaps)
        .where(inArray(schema.beatmaps.id, Array.from(beatmapIdSet)));

      const beatmapsComplete = beatmapStatuses.every(
        (row) =>
          row.dataFetchStatus === DataFetchStatus.Fetched ||
          row.dataFetchStatus === DataFetchStatus.NotFound
      );

      if (!beatmapsComplete) {
        return false;
      }
    }

    this.pendingAutomation.add(tournamentId);

    if (this.publishAutomationCheck) {
      try {
        await this.publishAutomationCheck({
          tournamentId,
          overrideVerifiedState: false,
        });
      } catch (error) {
        this.pendingAutomation.delete(tournamentId);
        throw error;
      }
    } else {
      this.logger.info(
        'Tournament ready for automation checks (no publisher)',
        {
          tournamentId,
        }
      );
      this.pendingAutomation.delete(tournamentId);
    }

    return true;
  }

  clearPendingAutomationCheck(tournamentId: number): void {
    this.pendingAutomation.delete(tournamentId);
  }

  private async syncTournamentDateRangeFromMatches(
    tournamentId: number
  ): Promise<void> {
    const matchRows = await this.db
      .select({ startTime: schema.matches.startTime })
      .from(schema.matches)
      .where(eq(schema.matches.tournamentId, tournamentId));

    const startTimes = matchRows
      .map((row) => row.startTime)
      .filter((value): value is string => typeof value === 'string')
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (startTimes.length === 0) {
      return;
    }

    const computedStartTime = startTimes[0].toISOString();
    const computedEndTime = startTimes[startTimes.length - 1].toISOString();

    const tournament = await this.db.query.tournaments.findFirst({
      where: eq(schema.tournaments.id, tournamentId),
      columns: {
        startTime: true,
        endTime: true,
      },
    });

    if (!tournament) {
      this.logger.warn('Attempted to sync dates for unknown tournament', {
        tournamentId,
      });
      return;
    }

    if (
      tournament.startTime === computedStartTime &&
      tournament.endTime === computedEndTime
    ) {
      return;
    }

    const nowIso = new Date().toISOString();

    await this.db
      .update(schema.tournaments)
      .set({
        startTime: computedStartTime,
        endTime: computedEndTime,
        updated: nowIso,
      })
      .where(eq(schema.tournaments.id, tournamentId));

    this.logger.info('Updated tournament date range from matches', {
      tournamentId,
      startTime: computedStartTime,
      endTime: computedEndTime,
    });
  }
}
