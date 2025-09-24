import type { ProcessTournamentAutomationCheckMessage } from '@otr/core';

import type { Logger } from '../logging/logger';
import type { QueueConsumer } from '../queue/types';
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
      const correlationId = message.metadata.correlationId;

      this.logger.info('Processing tournament automation check message', {
        tournamentId,
        correlationId,
      });

      try {
        const success = await this.service.processAutomationChecks(
          tournamentId,
          overrideVerifiedState
        );

        if (success) {
          this.logger.info('Tournament passed automation checks', {
            tournamentId,
            correlationId,
          });
        } else {
          this.logger.info('Tournament failed automation checks', {
            tournamentId,
            correlationId,
          });
        }

        await message.ack();
      } catch (error) {
        this.logger.error('Failed to process tournament automation checks', {
          tournamentId,
          correlationId,
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
