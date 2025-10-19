import { and, eq } from 'drizzle-orm';
import type { API, Match } from 'osu-api-v2-js';

import {
  ensureBeatmapPlaceholder,
  updateBeatmapStatus,
} from '../beatmap-store';
import { TournamentDataCompletionService } from './tournament-data-completion-service';
import { withNotFoundHandling } from '../api-helpers';
import {
  calculateScoreWithMods,
  convertModsToFlags,
  convertRuleset,
  convertScoreGrade,
  convertScoringType,
  convertTeam,
  convertTeamType,
  normalizeDate,
} from '../conversions';
import { getOrCreatePlayerId } from '../player-store';
import type { DatabaseClient } from '../../db';
import type { Logger } from '../../logging/logger';
import type { RateLimiter } from '../../rate-limiter';
import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import {
  GameRejectionReason,
  Ruleset,
  ScoreRejectionReason,
  VerificationStatus,
} from '@otr/core/osu/enums';
import {
  cascadeGameRejection,
  cascadeMatchRejection,
} from '@otr/core/db/rejection-cascade';
import { coerceNumericEnumValue } from '@otr/core';

const isManiaVariant = (
  value: Ruleset
): value is Ruleset.Mania4k | Ruleset.Mania7k =>
  value === Ruleset.Mania4k || value === Ruleset.Mania7k;

export const resolveRulesetWithTournament = (
  rawRuleset: Ruleset,
  tournamentRuleset: Ruleset
): Ruleset => {
  if (rawRuleset === Ruleset.ManiaOther && isManiaVariant(tournamentRuleset)) {
    return tournamentRuleset;
  }

  return rawRuleset;
};

interface MatchFetchServiceOptions {
  db: DatabaseClient;
  api: API;
  rateLimiter: RateLimiter;
  logger: Logger;
  publishBeatmapFetch: (osuBeatmapId: number) => Promise<void>;
  dataCompletion: TournamentDataCompletionService;
}

type MatchGame = NonNullable<Match.Event['game']>;

export class MatchFetchService {
  private readonly db: DatabaseClient;
  private readonly api: API;
  private readonly rateLimiter: RateLimiter;
  private readonly logger: Logger;
  private readonly publishBeatmapFetch: (osuBeatmapId: number) => Promise<void>;
  private readonly dataCompletion: TournamentDataCompletionService;

  constructor(options: MatchFetchServiceOptions) {
    this.db = options.db;
    this.api = options.api;
    this.rateLimiter = options.rateLimiter;
    this.logger = options.logger;
    this.publishBeatmapFetch = options.publishBeatmapFetch;
    this.dataCompletion = options.dataCompletion;
  }

  async fetchAndPersist(osuMatchId: number): Promise<boolean> {
    const matchRow = await this.db.query.matches.findFirst({
      where: eq(schema.matches.osuId, osuMatchId),
      columns: {
        id: true,
        tournamentId: true,
        dataFetchStatus: true,
        verificationStatus: true,
      },
      with: {
        tournament: {
          columns: {
            id: true,
            ruleset: true,
          },
        },
      },
    });

    if (!matchRow) {
      this.logger.error('Match record not found locally', { osuMatchId });
      return false;
    }

    const nowIso = new Date().toISOString();
    const tournamentRuleset = coerceNumericEnumValue(
      Ruleset,
      matchRow.tournament?.ruleset
    );

    await this.db
      .update(schema.matches)
      .set({ dataFetchStatus: DataFetchStatus.Fetching, updated: nowIso })
      .where(eq(schema.matches.id, matchRow.id));

    const paged = await this.fetchFullMatch(osuMatchId);
    if (!paged) {
      await this.dataCompletion.updateMatchFetchStatus(
        matchRow.id,
        DataFetchStatus.NotFound
      );
      this.logger.warn('osu! API returned no data for match', { osuMatchId });
      return false;
    }

    const { initialMatch, allEvents, allUsers } = paged;

    const beatmapsToQueue = new Map<number, { beatmapDbId: number }>();

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.matches)
        .set({
          name: initialMatch.match?.name ?? `Match ${matchRow.id}`,
          startTime: normalizeDate(initialMatch.match?.start_time) ?? null,
          endTime: normalizeDate(initialMatch.match?.end_time) ?? null,
          dataFetchStatus: DataFetchStatus.Fetched,
          updated: nowIso,
        })
        .where(eq(schema.matches.id, matchRow.id));

      const userMap = new Map<
        number,
        { username?: string; country?: string }
      >();
      for (const [userId, meta] of allUsers) {
        userMap.set(userId, meta);
        await getOrCreatePlayerId(tx, userId, meta);
      }

      const gameEvents = (allEvents ?? []).filter(
        (event) => event?.detail?.type === 'other' && event.game != null
      );

      const isMatchRejected =
        matchRow.verificationStatus === VerificationStatus.Rejected;
      const rejectedGameIds = new Set<number>();

      for (const event of gameEvents) {
        const game = event.game!;
        const rawRuleset = convertRuleset(game.mode_int ?? game.mode);
        const ruleset = resolveRulesetWithTournament(
          rawRuleset,
          tournamentRuleset ?? rawRuleset
        );
        const scoringType = convertScoringType(game.scoring_type);
        const teamType = convertTeamType(game.team_type);
        const mods = convertModsToFlags(game.mods ?? []);

        const beatmapRecord = await ensureBeatmapPlaceholder(
          tx,
          game.beatmap_id,
          DataFetchStatus.NotFetched,
          nowIso
        );

        if (beatmapRecord.dataFetchStatus === DataFetchStatus.NotFetched) {
          const [marked] = await tx
            .update(schema.beatmaps)
            .set({
              dataFetchStatus: DataFetchStatus.Fetching,
              updated: nowIso,
            })
            .where(
              and(
                eq(schema.beatmaps.id, beatmapRecord.id),
                eq(schema.beatmaps.dataFetchStatus, DataFetchStatus.NotFetched)
              )
            )
            .returning({ id: schema.beatmaps.id });

          if (marked) {
            beatmapsToQueue.set(game.beatmap_id, {
              beatmapDbId: beatmapRecord.id,
            });
          }
        }

        const existingGame = await tx.query.games.findFirst({
          where: eq(schema.games.osuId, game.id),
          columns: {
            id: true,
            verificationStatus: true,
          },
        });

        const gameValues = {
          matchId: matchRow.id,
          beatmapId: beatmapRecord.id,
          ruleset,
          scoringType,
          teamType,
          mods,
          startTime: normalizeDate(game.start_time) ?? nowIso,
          endTime: normalizeDate(game.end_time ?? game.start_time) ?? nowIso,
          updated: nowIso,
        };

        let gameId: number;
        let gameVerificationStatus = existingGame?.verificationStatus;

        if (existingGame) {
          await tx
            .update(schema.games)
            .set(gameValues)
            .where(eq(schema.games.id, existingGame.id));
          gameId = existingGame.id;
        } else {
          let verificationStatus = VerificationStatus.None;
          let rejectionReason = 0;

          if (matchRow.verificationStatus === VerificationStatus.Rejected) {
            verificationStatus = VerificationStatus.Rejected;
            rejectionReason = GameRejectionReason.RejectedMatch;
          }

          const [insertedGame] = await tx
            .insert(schema.games)
            .values({
              osuId: game.id,
              ...gameValues,
              verificationStatus,
              rejectionReason,
              warningFlags: 0,
            })
            .returning({
              id: schema.games.id,
              verificationStatus: schema.games.verificationStatus,
            });

          if (!insertedGame) {
            throw new Error('Failed to insert game');
          }

          gameId = insertedGame.id;
          gameVerificationStatus = insertedGame.verificationStatus;
        }

        await this.processScores({
          tx,
          gameId,
          game,
          ruleset,
          matchVerificationStatus: matchRow.verificationStatus,
          gameVerificationStatus:
            gameVerificationStatus ?? VerificationStatus.None,
          userMap,
          nowIso,
        });

        if (
          !isMatchRejected &&
          gameVerificationStatus === VerificationStatus.Rejected
        ) {
          rejectedGameIds.add(gameId);
        }
      }

      if (isMatchRejected) {
        await cascadeMatchRejection(tx, [matchRow.id], {
          updatedAt: nowIso,
        });
      } else if (rejectedGameIds.size > 0) {
        await cascadeGameRejection(tx, Array.from(rejectedGameIds), {
          updatedAt: nowIso,
        });
      }
    });

    for (const [beatmapId, { beatmapDbId }] of beatmapsToQueue) {
      try {
        await this.publishBeatmapFetch(beatmapId);
      } catch (error) {
        await updateBeatmapStatus(
          this.db,
          beatmapDbId,
          DataFetchStatus.NotFetched,
          new Date().toISOString()
        );
        throw error;
      }
    }

    await this.dataCompletion.updateMatchFetchStatus(
      matchRow.id,
      DataFetchStatus.Fetched
    );

    return true;
  }

  private async fetchFullMatch(osuMatchId: number): Promise<{
    initialMatch: Match;
    allEvents: NonNullable<Match['events']>;
    allUsers: Map<number, { username?: string; country?: string }>;
  } | null> {
    // Initial fetch to get match info and the boundary event ids
    const initialMatch = await this.rateLimiter.schedule(() =>
      withNotFoundHandling(() => this.api.getMatch(osuMatchId))
    );

    if (!initialMatch) {
      return null;
    }

    // Aggregate all events and users across pages without wasting calls
    const allEventsById = new Map<
      number,
      NonNullable<Match['events']>[number]
    >();
    const allUsers = new Map<number, { username?: string; country?: string }>();

    const addPage = (page: Match | null) => {
      if (!page) return { added: 0 };
      let added = 0;
      for (const user of page.users ?? []) {
        allUsers.set(user.id, {
          username: user.username,
          country: user.country_code,
        });
      }
      for (const event of page.events ?? []) {
        if (!allEventsById.has(event.id)) {
          allEventsById.set(event.id, event);
          added += 1;
        }
      }
      return { added };
    };

    addPage(initialMatch);

    const firstEventId = initialMatch.first_event_id;
    const latestEventId = initialMatch.latest_event_id;

    const limit = 100;
    let minSeenId = Infinity;
    let maxSeenId = -Infinity;
    for (const id of allEventsById.keys()) {
      if (id < minSeenId) minSeenId = id;
      if (id > maxSeenId) maxSeenId = id;
    }

    const hasFirst = () => allEventsById.has(firstEventId);
    const hasLatest = () => allEventsById.has(latestEventId);

    // Expand queries towards the start and end until both bounds are included
    while (!hasFirst() || !hasLatest()) {
      let progressed = false;

      if (!hasFirst()) {
        const query = Number.isFinite(minSeenId)
          ? { before: minSeenId, limit }
          : { after: firstEventId - 1, limit };

        const page = await this.rateLimiter.schedule(() =>
          withNotFoundHandling(() => this.api.getMatch(osuMatchId, query))
        );
        const { added } = addPage(page);
        if (added > 0) {
          progressed = true;
          for (const id of page?.events?.map((e) => e.id) ?? []) {
            if (id < minSeenId) minSeenId = id;
            if (id > maxSeenId) maxSeenId = id;
          }
        }
      }

      if (!hasLatest()) {
        const query = Number.isFinite(maxSeenId)
          ? { after: maxSeenId, limit }
          : { before: latestEventId + 1, limit };

        const page = await this.rateLimiter.schedule(() =>
          withNotFoundHandling(() => this.api.getMatch(osuMatchId, query))
        );
        const { added } = addPage(page);
        if (added > 0) {
          progressed = true;
          for (const id of page?.events?.map((e) => e.id) ?? []) {
            if (id < minSeenId) minSeenId = id;
            if (id > maxSeenId) maxSeenId = id;
          }
        }
      }

      // Avoid infinite loops in abnormal cases
      if (!progressed) {
        break;
      }
    }

    const allEvents = Array.from(allEventsById.values()).sort(
      (a, b) => a.id - b.id
    );

    return { initialMatch, allEvents, allUsers };
  }

  private async processScores(options: {
    tx: Pick<DatabaseClient, 'query' | 'insert' | 'update'>;
    gameId: number;
    game: MatchGame;
    ruleset: Ruleset;
    matchVerificationStatus: number;
    gameVerificationStatus: number;
    userMap: Map<number, { username?: string; country?: string }>;
    nowIso: string;
  }) {
    const {
      tx,
      gameId,
      game,
      ruleset,
      matchVerificationStatus,
      gameVerificationStatus,
      userMap,
      nowIso,
    } = options;

    const existingScores = await tx.query.gameScores.findMany({
      where: eq(schema.gameScores.gameId, gameId),
      columns: {
        id: true,
        playerId: true,
        verificationStatus: true,
      },
    });

    const scoreMap = new Map<
      number,
      { id: number; verificationStatus: number }
    >();
    for (const score of existingScores) {
      scoreMap.set(score.playerId, score);
    }

    for (const score of game.scores ?? []) {
      const userId = score.user_id;
      if (userId == null) {
        continue;
      }

      const playerId = await getOrCreatePlayerId(
        tx,
        userId,
        userMap.get(userId)
      );
      const team = convertTeam(score.match?.team ?? 'none');
      const mods = convertModsToFlags(score.mods ?? []);
      const totalScore = calculateScoreWithMods(score.total_score ?? 0, mods);
      const grade = convertScoreGrade(score.rank);

      const stats = score.statistics ?? {};
      const count300 = stats.great ?? stats.great ?? 0;
      const count100 = stats.ok ?? stats.ok ?? 0;
      const count50 = stats.meh ?? stats.meh ?? 0;
      const countMiss = stats.miss ?? stats.miss ?? 0;
      const countGeki = stats.large_bonus ?? 0;
      const countKatu = stats.small_bonus ?? 0;

      const baseValues = {
        score: totalScore,
        placement: 0,
        maxCombo: score.max_combo ?? 0,
        count300,
        count100,
        count50,
        countMiss,
        countGeki,
        countKatu,
        pass: score.passed ?? score.match?.pass ?? false,
        perfect: score.perfect ?? false,
        grade,
        mods,
        team,
        ruleset,
        updated: nowIso,
      };

      const existing = scoreMap.get(playerId);

      if (existing) {
        let verificationStatus = existing.verificationStatus;
        let rejectionReason = 0;

        if (
          matchVerificationStatus === VerificationStatus.Rejected ||
          gameVerificationStatus === VerificationStatus.Rejected
        ) {
          verificationStatus = VerificationStatus.Rejected;
          rejectionReason = ScoreRejectionReason.RejectedGame;
        }

        await tx
          .update(schema.gameScores)
          .set({
            ...baseValues,
            verificationStatus,
            rejectionReason,
          })
          .where(eq(schema.gameScores.id, existing.id));

        continue;
      }

      let verificationStatus = VerificationStatus.None;
      let rejectionReason = 0;

      if (
        matchVerificationStatus === VerificationStatus.Rejected ||
        gameVerificationStatus === VerificationStatus.Rejected
      ) {
        verificationStatus = VerificationStatus.Rejected;
        rejectionReason = ScoreRejectionReason.RejectedGame;
      }

      await tx.insert(schema.gameScores).values({
        gameId,
        playerId,
        ...baseValues,
        verificationStatus,
        rejectionReason,
      });
    }
  }
}
