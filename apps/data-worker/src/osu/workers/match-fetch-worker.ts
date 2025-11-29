import type { FetchMatchMessage } from '@otr/core';

import type { Logger } from '../../logging/logger';
import type { QueueConsumer } from '../../queue/types';
import { MatchFetchService } from '../services/match-fetch-service';

type MatchFetchServiceContract = Pick<MatchFetchService, 'fetchAndPersist'>;

interface MatchFetchWorkerOptions {
  queue: QueueConsumer<FetchMatchMessage>;
  service: MatchFetchServiceContract;
  logger: Logger;
}

export class MatchFetchWorker {
  private readonly queue: QueueConsumer<FetchMatchMessage>;
  private readonly service: MatchFetchServiceContract;
  private readonly logger: Logger;

  constructor(options: MatchFetchWorkerOptions) {
    this.queue = options.queue;
    this.service = options.service;
    this.logger = options.logger;
  }

  async start() {
    await this.queue.start(async (message) => {
      const { osuMatchId, isLazer } = message.payload;
      const msgLogger = this.logger.child({
        correlationId: message.metadata.correlationId,
        osuMatchId,
        isLazer,
      });

      msgLogger.info('processing match fetch');

      try {
        const persisted = await this.service.fetchAndPersist(
          osuMatchId,
          isLazer
        );

        if (!persisted) {
          msgLogger.warn('match fetch completed without persistence');
        }
        await message.ack();
      } catch (error) {
        msgLogger.error('failed to process match fetch', { error });
        await message.nack(true);
      }
    });
  }

  async stop() {
    await this.queue.stop();
  }
}
