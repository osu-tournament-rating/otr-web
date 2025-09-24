import type { FetchMatchMessage } from '@otr/core';

import type { Logger } from '../../logging/logger';
import type { QueueConsumer } from '../../queue/types';
import { MatchFetchService } from '../services/match-fetch-service';

interface MatchFetchWorkerOptions {
  queue: QueueConsumer<FetchMatchMessage>;
  service: MatchFetchService;
  logger: Logger;
}

export class MatchFetchWorker {
  private readonly queue: QueueConsumer<FetchMatchMessage>;
  private readonly service: MatchFetchService;
  private readonly logger: Logger;

  constructor(options: MatchFetchWorkerOptions) {
    this.queue = options.queue;
    this.service = options.service;
    this.logger = options.logger;
  }

  async start() {
    await this.queue.start(async (message) => {
      const { osuMatchId } = message.payload;
      this.logger.info('Processing match fetch message', {
        osuMatchId,
        correlationId: message.metadata.correlationId,
      });

      try {
        const persisted = await this.service.fetchAndPersist(osuMatchId);

        if (persisted) {
          this.logger.info('Successfully processed match fetch', {
            osuMatchId,
            correlationId: message.metadata.correlationId,
          });
        } else {
          this.logger.warn('Match fetch completed without persistence', {
            osuMatchId,
            correlationId: message.metadata.correlationId,
          });
        }
        await message.ack();
      } catch (error) {
        this.logger.error('Failed to process match fetch', {
          osuMatchId,
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
