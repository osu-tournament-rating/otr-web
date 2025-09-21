import { type FetchPlayerOsuTrackMessage, QueueConstants } from '@otr/core';
import type { UserStatUpdate } from '@otr/core';
import { consoleLogger, type Logger } from '../logging/logger';
import type { QueueConsumer } from '../queue/types';
import type { RateLimiter } from './rate-limiter';
import { OsuTrackClient } from './client';

export interface OsuTrackPlayerWorkerEvents {
  onUpdates?: (details: {
    message: FetchPlayerOsuTrackMessage;
    updates: UserStatUpdate[];
  }) => Promise<void> | void;
}

export interface OsuTrackPlayerWorkerOptions
  extends OsuTrackPlayerWorkerEvents {
  queue: QueueConsumer<FetchPlayerOsuTrackMessage>;
  client: OsuTrackClient;
  rateLimiter: RateLimiter;
  logger?: Logger;
}

const defaultLogger = consoleLogger;

export class OsuTrackPlayerWorker {
  private readonly queue: QueueConsumer<FetchPlayerOsuTrackMessage>;
  private readonly client: OsuTrackClient;
  private readonly rateLimiter: RateLimiter;
  private readonly logger: Logger;
  private readonly events: OsuTrackPlayerWorkerEvents;

  constructor(options: OsuTrackPlayerWorkerOptions) {
    this.queue = options.queue;
    this.client = options.client;
    this.rateLimiter = options.rateLimiter;
    this.logger = options.logger ?? defaultLogger;
    this.events = { onUpdates: options.onUpdates };
  }

  async start() {
    await this.queue.start(async (message) => {
      const envelope = message.payload;

      try {
        const updates = await this.rateLimiter.schedule(() =>
          this.client.fetchUserStatsHistory({
            osuPlayerId: envelope.osuPlayerId,
          })
        );

        this.logger.info('Fetched osu!track updates', {
          osuPlayerId: envelope.osuPlayerId,
          updateCount: updates.length,
          queue: QueueConstants.osuTrack.players,
        });

        await this.events.onUpdates?.({ message: envelope, updates });
        await message.ack();
      } catch (error) {
        this.logger.error('Failed to process osu!track player fetch', {
          osuPlayerId: envelope.osuPlayerId,
          error,
        });
        await message.nack(true);
      }
    });
  }

  async stop() {
    await this.queue.stop();
  }
}
