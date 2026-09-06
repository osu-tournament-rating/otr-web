import { and, asc, eq, isNull, lt, ne, or, sql } from 'drizzle-orm';
import type {
  FetchOsuMessage,
  FetchPlayerOsuTrackMessage,
  MessageEnvelope,
} from '@otr/core';
import { MessagePriority } from '@otr/core';
import { Ruleset } from '@otr/core/osu';
import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';

import type { DatabaseClient } from '../db';
import type { Logger } from '../logging/logger';
import type { QueuePublisher } from '@otr/core/queues';

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
const FETCH_LEASE_DAYS = 7;

// Ceilings on player_ratings.global_rank; `maxRank: null` matches any rank.
const REFETCH_TIERS = {
  osu: [
    { maxRank: 500, days: 1 },
    { maxRank: 5000, days: 3 },
    { maxRank: 20000, days: 7 },
  ],
  otherRulesets: [
    { maxRank: 500, days: 1 },
    { maxRank: null, days: 7 },
  ],
} as const;

type IntervalHandle = ReturnType<typeof setInterval> | null;

type QueuePublisherContract<TMessage extends MessageEnvelope<unknown>> = Pick<
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
    const cadenceDays = this.buildCadenceExpression(
      this.config.osu.outdatedDays
    );

    const players = await this.db
      .select({
        osuPlayerId: schema.players.osuId,
        cadenceDays,
        status: schema.players.dataFetchStatus,
        lastFetch: schema.players.osuLastFetch,
      })
      .from(schema.players)
      .leftJoin(
        schema.playerRatings,
        eq(schema.playerRatings.playerId, schema.players.id)
      )
      .groupBy(schema.players.id)
      .having(
        or(
          and(
            ne(schema.players.dataFetchStatus, DataFetchStatus.Fetching),
            sql`${schema.players.osuLastFetch} < now() - (${cadenceDays} * interval '1 day')`
          ),
          and(
            eq(schema.players.dataFetchStatus, DataFetchStatus.Fetching),
            lt(
              schema.players.osuLastFetch,
              this.calculateCutoff(FETCH_LEASE_DAYS)
            )
          )
        )
      )
      .orderBy(asc(cadenceDays), asc(schema.players.osuLastFetch));

    const enqueuedByCadence = new Map<number, number>();

    const enqueued = await this.enqueuePlayers({
      players,
      publish: async (osuPlayerId, player) => {
        const cadence = Number(player.cadenceDays);
        await this.osuPublisher.publish(
          { type: 'player', osuPlayerId },
          {
            metadata: {
              priority:
                cadence <= 1 ? MessagePriority.Normal : MessagePriority.Low,
            },
          }
        );
        enqueuedByCadence.set(
          cadence,
          (enqueuedByCadence.get(cadence) ?? 0) + 1
        );
      },
      logContext: 'osu!',
      source: 'osu',
    });

    if (enqueued > 0) {
      this.logger.info('Auto-refetch enqueued osu! players', {
        count: enqueued,
        byCadenceDays: Object.fromEntries(
          [...enqueuedByCadence.entries()].sort((a, b) => a[0] - b[0])
        ),
      });
    }
  }

  private buildCadenceExpression(fallbackDays: number) {
    // Inlined as literals so postgres types them as integers rather than text parameters.
    const literal = (value: number) => sql.raw(String(Math.trunc(value)));

    const branch = (
      rulesetMatch: ReturnType<typeof sql>,
      tier: { maxRank: number | null; days: number }
    ) =>
      tier.maxRank === null
        ? sql`when ${rulesetMatch} then ${literal(tier.days)}`
        : sql`when ${rulesetMatch} and ${schema.playerRatings.globalRank} <= ${literal(tier.maxRank)} then ${literal(tier.days)}`;

    const isOsu = sql`${schema.playerRatings.ruleset} = ${literal(Ruleset.Osu)}`;
    const isNotOsu = sql`${schema.playerRatings.ruleset} <> ${literal(Ruleset.Osu)}`;

    const branches = [
      ...REFETCH_TIERS.osu.map((tier) => branch(isOsu, tier)),
      ...REFETCH_TIERS.otherRulesets.map((tier) => branch(isNotOsu, tier)),
    ];

    return sql<number>`coalesce(min(case ${sql.join(branches, sql` `)} else ${literal(fallbackDays)} end), ${literal(fallbackDays)})`;
  }

  private async runOsuTrackRefetch() {
    const cutoffIso = this.calculateCutoff(this.config.osuTrack.outdatedDays);
    const players = await this.db
      .select({
        osuPlayerId: schema.players.osuId,
        status: schema.players.osuTrackDataFetchStatus,
        lastFetch: schema.players.osuTrackLastFetch,
      })
      .from(schema.players)
      .where(
        or(
          and(
            ne(
              schema.players.osuTrackDataFetchStatus,
              DataFetchStatus.Fetching
            ),
            or(
              isNull(schema.players.osuTrackLastFetch),
              lt(schema.players.osuTrackLastFetch, cutoffIso)
            )
          ),
          and(
            eq(
              schema.players.osuTrackDataFetchStatus,
              DataFetchStatus.Fetching
            ),
            or(
              isNull(schema.players.osuTrackLastFetch),
              lt(
                schema.players.osuTrackLastFetch,
                this.calculateCutoff(FETCH_LEASE_DAYS)
              )
            )
          )
        )
      )
      .orderBy(asc(schema.players.osuTrackLastFetch));

    const enqueued = await this.enqueuePlayers({
      players,
      publish: async (osuPlayerId) => {
        await this.osuTrackPublisher.publish(
          { osuPlayerId },
          { metadata: { priority: MessagePriority.Low } }
        );
      },
      logContext: 'osu!track',
      source: 'osuTrack',
    });

    if (enqueued > 0) {
      this.logger.info('Auto-refetch enqueued osu!track players', {
        count: enqueued,
      });
    }
  }

  private async enqueuePlayers<
    TPlayer extends {
      osuPlayerId: number;
      status: number;
      lastFetch: string | null;
    },
  >(options: {
    players: Array<TPlayer>;
    publish: (osuPlayerId: number, player: TPlayer) => Promise<void>;
    logContext: string;
    source: 'osu' | 'osuTrack';
  }): Promise<number> {
    let enqueued = 0;
    const statusKey =
      options.source === 'osu' ? 'dataFetchStatus' : 'osuTrackDataFetchStatus';
    const fetchKey =
      options.source === 'osu' ? 'osuLastFetch' : 'osuTrackLastFetch';
    const statusColumn = schema.players[statusKey];
    const fetchColumn = schema.players[fetchKey];

    for (const player of options.players) {
      const osuPlayerId = player.osuPlayerId;

      const leaseIso = new Date().toISOString();
      let claimed = false;
      try {
        const rows = await this.db
          .update(schema.players)
          .set({
            [statusKey]: DataFetchStatus.Fetching,
            [fetchKey]: leaseIso,
            updated: leaseIso,
          })
          .where(
            and(
              eq(schema.players.osuId, osuPlayerId),
              eq(statusColumn, player.status),
              player.lastFetch === null
                ? isNull(fetchColumn)
                : eq(fetchColumn, player.lastFetch)
            )
          )
          .returning({ id: schema.players.id });
        if (rows.length === 0) continue;
        claimed = true;
        await options.publish(osuPlayerId, player);
        enqueued += 1;
      } catch (error) {
        if (claimed) {
          try {
            // A publisher can report failure after delivery; preserve worker completion.
            await this.db
              .update(schema.players)
              .set({
                [statusKey]: DataFetchStatus.Error,
                [fetchKey]: player.lastFetch,
                updated: new Date().toISOString(),
              })
              .where(
                and(
                  eq(schema.players.osuId, osuPlayerId),
                  eq(statusColumn, DataFetchStatus.Fetching),
                  eq(fetchColumn, leaseIso)
                )
              );
          } catch (resetError) {
            this.logger.error('Failed to release auto-refetch lease', {
              osuPlayerId,
              queue: options.logContext,
              error: resetError,
            });
          }
        }
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
}
