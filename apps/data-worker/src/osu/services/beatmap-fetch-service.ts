import type { API } from 'osu-api-v2-js';

import { withApiErrorHandling } from '../api-helpers';
import {
  convertBeatmapRankStatus,
  convertRuleset,
  normalizeDate,
} from '../conversions';
import {
  ensureBeatmapPlaceholder,
  updateBeatmapStatus,
} from '../beatmap-store';
import {
  getOrCreatePlayerId,
  getPlayerFetchStatus,
  setPlayerFetchStatusByOsuId,
} from '../player-store';
import { TournamentDataCompletionService } from './tournament-data-completion-service';
import type { DatabaseClient } from '../../db';
import type { Logger } from '../../logging/logger';
import type { RateLimiter } from '../../rate-limiter';
import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';

interface BeatmapFetchServiceOptions {
  db: DatabaseClient;
  api: API;
  rateLimiter: RateLimiter;
  logger: Logger;
  dataCompletion: TournamentDataCompletionService;
  publishPlayerFetch: (osuPlayerId: number) => Promise<void>;
}

export class BeatmapFetchService {
  private readonly db: DatabaseClient;
  private readonly api: API;
  private readonly rateLimiter: RateLimiter;
  private readonly logger: Logger;
  private readonly dataCompletion: TournamentDataCompletionService;
  private readonly publishPlayerFetch: (osuPlayerId: number) => Promise<void>;

  constructor(options: BeatmapFetchServiceOptions) {
    this.db = options.db;
    this.api = options.api;
    this.rateLimiter = options.rateLimiter;
    this.logger = options.logger;
    this.dataCompletion = options.dataCompletion;
    this.publishPlayerFetch = options.publishPlayerFetch;
  }

  async fetchAndPersist(
    osuBeatmapId: number,
    options?: { skipAutomationChecks?: boolean }
  ): Promise<boolean> {
    const nowIso = new Date().toISOString();

    const beatmapRecord = await ensureBeatmapPlaceholder(
      this.db,
      osuBeatmapId,
      DataFetchStatus.Fetching,
      nowIso
    );

    const beatmapId = beatmapRecord.id;

    if (beatmapRecord.dataFetchStatus !== DataFetchStatus.Fetching) {
      await updateBeatmapStatus(
        this.db,
        beatmapId,
        DataFetchStatus.Fetching,
        nowIso
      );
    }

    const beatmapResult = await this.rateLimiter.schedule(() =>
      withApiErrorHandling(() => this.api.getBeatmap(osuBeatmapId))
    );

    if (beatmapResult.status === 'unauthorized') {
      this.logger.error(
        'Unauthorized fetching beatmap - check API credentials',
        {
          osuBeatmapId,
        }
      );
      await this.dataCompletion.updateBeatmapFetchStatus(
        beatmapId,
        DataFetchStatus.Error,
        { skipAutomationChecks: options?.skipAutomationChecks }
      );
      return false;
    }

    if (beatmapResult.status === 'not_found') {
      await this.dataCompletion.updateBeatmapFetchStatus(
        beatmapId,
        DataFetchStatus.NotFound,
        { skipAutomationChecks: options?.skipAutomationChecks }
      );
      this.logger.warn('Beatmap not found in osu! API', { osuBeatmapId });
      return false;
    }

    const apiBeatmap = beatmapResult.data;

    const beatmapsetResult = await this.rateLimiter.schedule(() =>
      withApiErrorHandling(() =>
        this.api.getBeatmapset(apiBeatmap.beatmapset_id)
      )
    );

    if (beatmapsetResult.status === 'unauthorized') {
      this.logger.error(
        'Unauthorized fetching beatmapset - check API credentials',
        {
          osuBeatmapId,
          beatmapsetId: apiBeatmap.beatmapset_id,
        }
      );
      await this.dataCompletion.updateBeatmapFetchStatus(
        beatmapId,
        DataFetchStatus.Error,
        { skipAutomationChecks: options?.skipAutomationChecks }
      );
      return false;
    }

    if (beatmapsetResult.status === 'not_found') {
      await this.dataCompletion.updateBeatmapFetchStatus(
        beatmapId,
        DataFetchStatus.NotFound,
        { skipAutomationChecks: options?.skipAutomationChecks }
      );
      this.logger.warn('Beatmapset not found for beatmap', {
        osuBeatmapId,
        beatmapsetId: apiBeatmap.beatmapset_id,
      });
      return false;
    }

    const apiBeatmapset = beatmapsetResult.data;

    const result = await this.db.transaction(async (tx) => {
      const creatorId = await getOrCreatePlayerId(tx, apiBeatmapset.user_id, {
        username: apiBeatmapset.creator,
      });

      const beatmapsetValues = {
        artist: apiBeatmapset.artist ?? '',
        title: apiBeatmapset.title ?? '',
        rankedStatus: convertBeatmapRankStatus(
          (apiBeatmapset.status ?? apiBeatmapset.ranked) as
            | string
            | number
            | undefined
        ),
        rankedDate: normalizeDate(apiBeatmapset.ranked_date),
        submittedDate: normalizeDate(apiBeatmapset.submitted_date),
        creatorId,
        updated: nowIso,
      };

      const [beatmapsetRow] = await tx
        .insert(schema.beatmapsets)
        .values({
          osuId: apiBeatmapset.id,
          ...beatmapsetValues,
        })
        .onConflictDoUpdate({
          target: schema.beatmapsets.osuId,
          set: beatmapsetValues,
        })
        .returning({ id: schema.beatmapsets.id });

      const beatmapRows = Array.isArray(apiBeatmapset.beatmaps)
        ? apiBeatmapset.beatmaps
        : [apiBeatmap];

      // Collect unique user IDs from all beatmaps
      const userIds = new Set<number>();
      for (const beatmap of beatmapRows) {
        if (beatmap.user_id) {
          userIds.add(beatmap.user_id);
        }
      }

      // Enqueue player fetch messages for background processing
      // Skip if player is already being fetched (status === Fetching)
      for (const userId of userIds) {
        try {
          const status = await getPlayerFetchStatus(tx, userId);
          if (status === DataFetchStatus.Fetching) {
            this.logger.debug('Skipping player enqueue - already fetching', {
              userId,
            });
            continue;
          }
          await setPlayerFetchStatusByOsuId(
            tx,
            userId,
            DataFetchStatus.Fetching,
            nowIso
          );
          await this.publishPlayerFetch(userId);
        } catch (error) {
          this.logger.error('Failed to enqueue player fetch', {
            userId,
            error,
          });
        }
      }

      const affectedBeatmapIds: number[] = [];

      for (const beatmap of beatmapRows) {
        const ruleset = convertRuleset(beatmap.mode_int ?? beatmap.mode);

        const beatmapValues = {
          ruleset,
          rankedStatus: convertBeatmapRankStatus(
            (beatmap.status ?? beatmap.ranked) as string | number | undefined
          ),
          diffName: beatmap.version ?? 'Unknown',
          totalLength: beatmap.total_length ?? 0,
          drainLength: beatmap.hit_length ?? 0,
          bpm: beatmap.bpm ?? 0,
          countCircle: beatmap.count_circles ?? 0,
          countSlider: beatmap.count_sliders ?? 0,
          countSpinner: beatmap.count_spinners ?? 0,
          cs: beatmap.cs ?? 0,
          hp: beatmap.drain ?? 0,
          od: beatmap.accuracy ?? 0,
          ar: beatmap.ar ?? 0,
          sr: beatmap.difficulty_rating ?? 0,
          maxCombo: beatmap.max_combo ?? null,
          beatmapsetId: beatmapsetRow.id,
          dataFetchStatus: DataFetchStatus.Fetched,
          updated: nowIso,
        };

        const [row] = await tx
          .insert(schema.beatmaps)
          .values({
            osuId: beatmap.id,
            ...beatmapValues,
          })
          .onConflictDoUpdate({
            target: schema.beatmaps.osuId,
            set: beatmapValues,
          })
          .returning({ id: schema.beatmaps.id });

        if (row) {
          affectedBeatmapIds.push(row.id);

          // Create or update player record for beatmap creator
          if (beatmap.user_id) {
            const beatmapCreatorId = await getOrCreatePlayerId(
              tx,
              beatmap.user_id
            );

            // Link beatmap to its creator in join table
            await tx
              .insert(schema.joinBeatmapCreators)
              .values({
                createdBeatmapsId: row.id,
                creatorsId: beatmapCreatorId,
              })
              .onConflictDoNothing();
          }
        }
      }

      return {
        beatmapsetId: beatmapsetRow.id,
        affectedBeatmapIds,
      };
    });

    this.logger.info('Beatmapset processed', {
      beatmapsetId: result.beatmapsetId,
      osuBeatmapId,
    });

    const beatmapIds = new Set<number>(result.affectedBeatmapIds);
    beatmapIds.add(beatmapId);

    for (const id of beatmapIds) {
      await updateBeatmapStatus(this.db, id, DataFetchStatus.Fetched, nowIso);
      await this.dataCompletion.updateBeatmapFetchStatus(
        id,
        DataFetchStatus.Fetched,
        { skipAutomationChecks: options?.skipAutomationChecks }
      );
    }

    return true;
  }
}
