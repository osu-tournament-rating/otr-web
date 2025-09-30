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
    const correlationId = message.metadata.correlationId;

    this.logger.info('Processing tournament stats message', {
      tournamentId,
      correlationId,
    });

    try {
      const success = await this.service.processTournamentStats(tournamentId);

      if (!success) {
        this.logger.warn('Tournament statistics processing failed', {
          tournamentId,
          correlationId,
        });
      }

      await message.ack();
    } catch (error) {
      this.logger.error('Failed to process tournament statistics', {
        tournamentId,
        correlationId,
        error,
      });

      await message.nack(true);
    }
  }
}
