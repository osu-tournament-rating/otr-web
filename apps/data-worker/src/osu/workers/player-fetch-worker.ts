import type { FetchPlayerMessage } from '@otr/core';

import type { Logger } from '../../logging/logger';
import type { QueueConsumer } from '../../queue/types';
import { PlayerFetchService } from '../services/player-fetch-service';

type PlayerFetchServiceContract = Pick<PlayerFetchService, 'fetchAndPersist'>;

interface PlayerFetchWorkerEvents {
  onProcessed?: (details: { osuPlayerId: number }) => Promise<void> | void;
}

interface PlayerFetchWorkerOptions extends PlayerFetchWorkerEvents {
  queue: QueueConsumer<FetchPlayerMessage>;
  service: PlayerFetchServiceContract;
  logger: Logger;
}

export class PlayerFetchWorker {
  private readonly queue: QueueConsumer<FetchPlayerMessage>;
  private readonly service: PlayerFetchServiceContract;
  private readonly logger: Logger;
  private readonly events: PlayerFetchWorkerEvents;

  constructor(options: PlayerFetchWorkerOptions) {
    this.queue = options.queue;
    this.service = options.service;
    this.logger = options.logger;
    this.events = { onProcessed: options.onProcessed };
  }

  async start() {
    await this.queue.start(async (message) => {
      const { osuPlayerId } = message.payload;
      this.logger.info('Processing player fetch message', {
        osuPlayerId,
        correlationId: message.metadata.correlationId,
      });

      try {
        await this.service.fetchAndPersist(osuPlayerId);
        await message.ack();
        await this.events.onProcessed?.({ osuPlayerId });
      } catch (error) {
        this.logger.error('Failed to process player fetch', {
          osuPlayerId,
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
