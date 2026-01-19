import { and, asc, isNull, lt, ne, or } from 'drizzle-orm';
import type { FetchOsuMessage, FetchPlayerOsuTrackMessage } from '@otr/core';
import { MessagePriority } from '@otr/core';
import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';

import type { DatabaseClient } from '../db';
import type { Logger } from '../logging/logger';
import type { QueuePublisher } from '../queue/types';
import {
  setPlayerFetchStatusByOsuId,
  setPlayerOsuTrackFetchStatusByOsuId,
} from '../osu/player-store';

type AutoRefetchConfig = {
  enabled: boolean;
  intervalMinutes: number;
  outdatedDays: number;
};

type SchedulerConfig = {
  osu: AutoRefetchConfig;
  osuTrack: AutoRefetchConfig;
};

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

type IntervalHandle = ReturnType<typeof setInterval> | null;

type QueuePublisherContract<TMessage> = Pick<
  QueuePublisher<TMessage>,
  'publish'
>;

interface PlayerRefetchSchedulerOptions {
  db: DatabaseClient;
  logger: Logger;
  osuPublisher: QueuePublisherContract<FetchOsuMessage>;
  osuTrackPublisher: QueuePublisherContract<FetchPlayerOsuTrackMessage>;
  config: SchedulerConfig;
}

export class PlayerRefetchScheduler {
  private readonly db: DatabaseClient;
  private readonly logger: Logger;
  private readonly osuPublisher: QueuePublisherContract<FetchOsuMessage>;
  private readonly osuTrackPublisher: QueuePublisherContract<FetchPlayerOsuTrackMessage>;
  private readonly config: SchedulerConfig;

  private osuInterval: IntervalHandle = null;
  private osuTrackInterval: IntervalHandle = null;
  private osuInFlight: Promise<void> | null = null;
  private osuTrackInFlight: Promise<void> | null = null;
  private started = false;

  private readonly osuPending = new Set<number>();
  private readonly osuTrackPending = new Set<number>();
  private readonly osuLastScheduled = new Map<number, number>();
  private readonly osuTrackLastScheduled = new Map<number, number>();

  constructor(options: PlayerRefetchSchedulerOptions) {
    this.db = options.db;
    this.logger = options.logger;
    this.osuPublisher = options.osuPublisher;
    this.osuTrackPublisher = options.osuTrackPublisher;
    this.config = options.config;
  }

  async start() {
    if (this.started) {
      throw new Error('PlayerRefetchScheduler already started');
    }

    this.started = true;

    if (this.config.osu.enabled) {
      const osuIntervalMs = this.config.osu.intervalMinutes * MS_PER_MINUTE;
      await this.runOsuRefetchSafely();
      this.osuInterval = setInterval(() => {
        void this.runOsuRefetchSafely();
      }, osuIntervalMs);
    }

    if (this.config.osuTrack.enabled) {
      const osuTrackIntervalMs =
        this.config.osuTrack.intervalMinutes * MS_PER_MINUTE;
      await this.runOsuTrackRefetchSafely();
      this.osuTrackInterval = setInterval(() => {
        void this.runOsuTrackRefetchSafely();
      }, osuTrackIntervalMs);
    }
  }

  async stop() {
    if (!this.started) {
      return;
    }

    if (this.osuInterval) {
      clearInterval(this.osuInterval);
      this.osuInterval = null;
    }

    if (this.osuTrackInterval) {
      clearInterval(this.osuTrackInterval);
      this.osuTrackInterval = null;
    }

    await Promise.allSettled([
      this.osuInFlight?.catch(() => undefined),
      this.osuTrackInFlight?.catch(() => undefined),
    ]);

    this.started = false;
  }

  private runOsuRefetchSafely() {
    if (this.osuInFlight) {
      return this.osuInFlight;
    }

    this.osuInFlight = this.runOsuRefetch()
      .catch((error) => {
        this.logger.error('Failed to enqueue outdated osu! players', { error });
      })
      .finally(() => {
        this.osuInFlight = null;
      });

    return this.osuInFlight;
  }

  private runOsuTrackRefetchSafely() {
    if (this.osuTrackInFlight) {
      return this.osuTrackInFlight;
    }

    this.osuTrackInFlight = this.runOsuTrackRefetch()
      .catch((error) => {
        this.logger.error('Failed to enqueue outdated osu!track players', {
          error,
        });
      })
      .finally(() => {
        this.osuTrackInFlight = null;
      });

    return this.osuTrackInFlight;
  }

  private async runOsuRefetch() {
    const cutoffIso = this.calculateCutoff(this.config.osu.outdatedDays);
    const players = await this.db
      .select({ osuPlayerId: schema.players.osuId })
      .from(schema.players)
      .where(
        and(
          ne(schema.players.dataFetchStatus, DataFetchStatus.Fetching),
          lt(schema.players.osuLastFetch, cutoffIso)
        )
      )
      .orderBy(asc(schema.players.osuLastFetch));

    const enqueued = await this.enqueuePlayers({
      players,
      pending: this.osuPending,
      lastScheduled: this.osuLastScheduled,
      intervalMinutes: this.config.osu.intervalMinutes,
      publish: async (osuPlayerId) => {
        await this.osuPublisher.publish(
          { type: 'player', osuPlayerId },
          { metadata: { priority: MessagePriority.Low } }
        );
      },
      logContext: 'osu!',
      setFetchingStatus: async (osuPlayerId) => {
        await setPlayerFetchStatusByOsuId(
          this.db,
          osuPlayerId,
          DataFetchStatus.Fetching,
          new Date().toISOString()
        );
      },
    });

    if (enqueued > 0) {
      this.logger.info('Auto-refetch enqueued osu! players', {
        count: enqueued,
      });
    }
  }

  private async runOsuTrackRefetch() {
    const cutoffIso = this.calculateCutoff(this.config.osuTrack.outdatedDays);
    const players = await this.db
      .select({
        osuPlayerId: schema.players.osuId,
      })
      .from(schema.players)
      .where(
        and(
          ne(schema.players.osuTrackDataFetchStatus, DataFetchStatus.Fetching),
          or(
            isNull(schema.players.osuTrackLastFetch),
            lt(schema.players.osuTrackLastFetch, cutoffIso)
          )
        )
      )
      .orderBy(asc(schema.players.osuTrackLastFetch));

    const enqueued = await this.enqueuePlayers({
      players,
      pending: this.osuTrackPending,
      lastScheduled: this.osuTrackLastScheduled,
      intervalMinutes: this.config.osuTrack.intervalMinutes,
      publish: async (osuPlayerId) => {
        await this.osuTrackPublisher.publish(
          { osuPlayerId },
          { metadata: { priority: MessagePriority.Low } }
        );
      },
      logContext: 'osu!track',
      setFetchingStatus: async (osuPlayerId) => {
        await setPlayerOsuTrackFetchStatusByOsuId(
          this.db,
          osuPlayerId,
          DataFetchStatus.Fetching,
          new Date().toISOString()
        );
      },
    });

    if (enqueued > 0) {
      this.logger.info('Auto-refetch enqueued osu!track players', {
        count: enqueued,
      });
    }
  }

  private async enqueuePlayers(options: {
    players: Array<{ osuPlayerId: number }>;
    pending: Set<number>;
    lastScheduled: Map<number, number>;
    intervalMinutes: number;
    publish: (osuPlayerId: number) => Promise<void>;
    logContext: string;
    setFetchingStatus?: (osuPlayerId: number) => Promise<void>;
  }): Promise<number> {
    const intervalMs = options.intervalMinutes * MS_PER_MINUTE;
    const now = Date.now();
    let enqueued = 0;

    for (const player of options.players) {
      const osuPlayerId = player.osuPlayerId;

      if (options.pending.has(osuPlayerId)) {
        continue;
      }

      const lastScheduledAt = options.lastScheduled.get(osuPlayerId) ?? 0;

      if (now - lastScheduledAt < intervalMs) {
        continue;
      }

      try {
        if (options.setFetchingStatus) {
          await options.setFetchingStatus(osuPlayerId);
        }
        await options.publish(osuPlayerId);
        options.pending.add(osuPlayerId);
        options.lastScheduled.set(osuPlayerId, now);
        enqueued += 1;
      } catch (error) {
        this.logger.error('Failed to publish auto-refetch player', {
          osuPlayerId,
          queue: options.logContext,
          error,
        });
      }
    }

    return enqueued;
  }

  private calculateCutoff(outdatedDays: number) {
    const cutoff = new Date(Date.now() - outdatedDays * MS_PER_DAY);
    return cutoff.toISOString();
  }

  markOsuPlayerProcessed(osuPlayerId: number) {
    this.osuPending.delete(osuPlayerId);
    this.osuLastScheduled.set(osuPlayerId, Date.now());
  }

  markOsuTrackPlayerProcessed(osuPlayerId: number) {
    this.osuTrackPending.delete(osuPlayerId);
    this.osuTrackLastScheduled.set(osuPlayerId, Date.now());
  }
}
