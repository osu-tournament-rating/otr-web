import type { FetchBeatmapMessage } from '@otr/core';

import type { Logger } from '../../logging/logger';
import type { QueueConsumer } from '../../queue/types';
import { BeatmapFetchService } from '../services/beatmap-fetch-service';

type BeatmapFetchServiceContract = Pick<BeatmapFetchService, 'fetchAndPersist'>;

interface BeatmapFetchWorkerOptions {
  queue: QueueConsumer<FetchBeatmapMessage>;
  service: BeatmapFetchServiceContract;
  logger: Logger;
}

export class BeatmapFetchWorker {
  private readonly queue: QueueConsumer<FetchBeatmapMessage>;
  private readonly service: BeatmapFetchServiceContract;
  private readonly logger: Logger;

  constructor(options: BeatmapFetchWorkerOptions) {
    this.queue = options.queue;
    this.service = options.service;
    this.logger = options.logger;
  }

  async start() {
    await this.queue.start(async (message) => {
      const { beatmapId, skipAutomationChecks } = message.payload;
      const msgLogger = this.logger.child({
        correlationId: message.metadata.correlationId,
        beatmapId,
        skipAutomationChecks,
      });

      msgLogger.info('processing beatmap fetch');

      try {
        await this.service.fetchAndPersist(beatmapId, { skipAutomationChecks });
        await message.ack();
      } catch (error) {
        msgLogger.error('failed to process beatmap fetch', { error });
        await message.nack(true);
      }
    });
  }

  async stop() {
    await this.queue.stop();
  }
}
