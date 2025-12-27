import { type FetchPlayerOsuTrackMessage } from '@otr/core';
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
  onProcessed?: (details: { osuPlayerId: number }) => Promise<void> | void;
}

export interface OsuTrackPlayerWorkerOptions extends OsuTrackPlayerWorkerEvents {
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
    this.events = {
      onPlayer: options.onPlayer,
      onProcessed: options.onProcessed,
    };
  }

  async start() {
    await this.queue.start(async (message) => {
      const envelope = message.payload;
      const msgLogger = this.logger.child({
        correlationId: envelope.correlationId,
        osuPlayerId: envelope.osuPlayerId,
      });

      msgLogger.info('processing osu!track player fetch');

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

          msgLogger.info('fetched osu!track updates', {
            mode,
            updateCount: updates.length,
          });

          results.push({ mode, updates });
        }
        await this.events.onPlayer?.({ message: envelope, results });
        await message.ack();
        await this.events.onProcessed?.({ osuPlayerId: envelope.osuPlayerId });

        const summary = results
          .map((entry) => `${entry.mode}:${entry.updates.length}`)
          .join(',');
        msgLogger.info('osu!track player fetch completed', { modes: summary });
      } catch (error) {
        msgLogger.error('failed to process osu!track player fetch', { error });
        await message.nack(true);
      }
    });
  }

  async stop() {
    await this.queue.stop();
  }
}
