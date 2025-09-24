import type { FetchBeatmapMessage } from '@otr/core';

import type { Logger } from '../../logging/logger';
import type { QueueConsumer } from '../../queue/types';
import { BeatmapFetchService } from '../services/beatmap-fetch-service';

interface BeatmapFetchWorkerOptions {
  queue: QueueConsumer<FetchBeatmapMessage>;
  service: BeatmapFetchService;
  logger: Logger;
}

export class BeatmapFetchWorker {
  private readonly queue: QueueConsumer<FetchBeatmapMessage>;
  private readonly service: BeatmapFetchService;
  private readonly logger: Logger;

  constructor(options: BeatmapFetchWorkerOptions) {
    this.queue = options.queue;
    this.service = options.service;
    this.logger = options.logger;
  }

  async start() {
    await this.queue.start(async (message) => {
      const { beatmapId } = message.payload;
      this.logger.info('Processing beatmap fetch message', {
        beatmapId,
        correlationId: message.metadata.correlationId,
      });

      try {
        await this.service.fetchAndPersist(beatmapId);
        await message.ack();
      } catch (error) {
        this.logger.error('Failed to process beatmap fetch', {
          beatmapId,
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
