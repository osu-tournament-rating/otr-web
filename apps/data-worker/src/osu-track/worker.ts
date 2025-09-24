import { type FetchPlayerOsuTrackMessage, QueueConstants } from '@otr/core';
import type { UserStatUpdate } from '@otr/core';

import { consoleLogger, type Logger } from '../logging/logger';
import type { QueueConsumer } from '../queue/types';
import type { RateLimiter } from '../rate-limiter';
import { OsuTrackClient } from './client';

export interface OsuTrackPlayerWorkerEvents {
  onPlayer?: (details: {
    message: FetchPlayerOsuTrackMessage;
    results: Array<{
      mode: number;
      updates: UserStatUpdate[];
    }>;
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
    this.events = { onPlayer: options.onPlayer };
  }

  async start() {
    await this.queue.start(async (message) => {
      const envelope = message.payload;

      this.logger.info(
        `osu!track queue received player ${envelope.osuPlayerId} (${envelope.correlationId})`
      );

      try {
        const results: Array<{ mode: number; updates: UserStatUpdate[] }> = [];
        const modes = [0, 1, 2, 3];

        for (const mode of modes) {
          const updates = await this.rateLimiter.schedule(() =>
            this.client.fetchUserStatsHistory({
              osuPlayerId: envelope.osuPlayerId,
              mode,
            })
          );

          this.logger.info(
            `osu!track fetched ${updates.length} updates for player ${envelope.osuPlayerId} mode ${mode}`
          );

          results.push({ mode, updates });
        }
        await this.events.onPlayer?.({ message: envelope, results });
        await message.ack();

        const summary = results
          .map((entry) => `${entry.mode}:${entry.updates.length}`)
          .join(',');
        this.logger.info(
          `osu!track acknowledged player ${envelope.osuPlayerId} (${envelope.correlationId}) modes ${summary}`
        );
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
