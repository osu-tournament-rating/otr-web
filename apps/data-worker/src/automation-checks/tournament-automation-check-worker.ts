import type { ProcessTournamentAutomationCheckMessage } from '@otr/core';

import type { Logger } from '../logging/logger';
import type { QueueConsumer } from '@otr/core/queues';
import type { TournamentDataCompletionService } from '../osu/services/tournament-data-completion-service';
import { TournamentAutomationCheckService } from './tournament-automation-check-service';

interface TournamentAutomationCheckWorkerOptions {
  queue: QueueConsumer<ProcessTournamentAutomationCheckMessage>;
  service: TournamentAutomationCheckService;
  dataCompletion: TournamentDataCompletionService;
  logger: Logger;
}

export class TournamentAutomationCheckWorker {
  private readonly queue: QueueConsumer<ProcessTournamentAutomationCheckMessage>;
  private readonly service: TournamentAutomationCheckService;
  private readonly dataCompletion: TournamentDataCompletionService;
  private readonly logger: Logger;

  constructor(options: TournamentAutomationCheckWorkerOptions) {
    this.queue = options.queue;
    this.service = options.service;
    this.dataCompletion = options.dataCompletion;
    this.logger = options.logger;
  }

  async start() {
    await this.queue.start(async (message) => {
      const { tournamentId, overrideVerifiedState } = message.payload;
      const msgLogger = this.logger.child({
        correlationId: message.metadata.correlationId,
        tournamentId,
      });

      msgLogger.info('processing tournament automation check');

      try {
        const success = await this.service.processAutomationChecks(
          tournamentId,
          overrideVerifiedState
        );

        if (success) {
          msgLogger.info('tournament passed automation checks');
        } else {
          msgLogger.info('tournament failed automation checks');
        }

        await message.ack();
      } catch (error) {
        msgLogger.error('failed to process tournament automation checks', {
          error,
        });
        await message.nack(true);
      } finally {
        this.dataCompletion.clearPendingAutomationCheck(tournamentId);
      }
    });
  }

  async stop() {
    await this.queue.stop();
  }
}
