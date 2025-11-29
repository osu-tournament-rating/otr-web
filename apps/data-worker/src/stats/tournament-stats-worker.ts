import type { ProcessTournamentStatsMessage } from '@otr/core';

import type { Logger } from '../logging/logger';
import type { QueueConsumer, QueueMessage } from '../queue/types';
import { TournamentStatsService } from './tournament-stats-service';

interface TournamentStatsWorkerOptions {
  queue: QueueConsumer<ProcessTournamentStatsMessage>;
  service: TournamentStatsService;
  logger: Logger;
}

export class TournamentStatsWorker {
  private readonly queue: QueueConsumer<ProcessTournamentStatsMessage>;
  private readonly service: TournamentStatsService;
  private readonly logger: Logger;

  constructor(options: TournamentStatsWorkerOptions) {
    this.queue = options.queue;
    this.service = options.service;
    this.logger = options.logger;
  }

  async start() {
    await this.queue.start((message) => this.handleMessage(message));
  }

  async stop() {
    await this.queue.stop();
  }

  private async handleMessage(
    message: QueueMessage<ProcessTournamentStatsMessage>
  ) {
    const { tournamentId } = message.payload;
    const msgLogger = this.logger.child({
      correlationId: message.metadata.correlationId,
      tournamentId,
    });

    msgLogger.info('processing tournament stats');

    try {
      const success = await this.service.processTournamentStats(tournamentId);

      if (!success) {
        msgLogger.warn('tournament statistics processing failed');
      }

      await message.ack();
    } catch (error) {
      msgLogger.error('failed to process tournament statistics', { error });
      await message.nack(true);
    }
  }
}
