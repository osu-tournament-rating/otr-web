import { describe, expect, it } from 'bun:test';
import {
  MessagePriority,
  type ProcessTournamentAutomationCheckMessage,
} from '@otr/core';

import { TournamentAutomationCheckWorker } from '../tournament-automation-check-worker';
import type { TournamentAutomationCheckService } from '../tournament-automation-check-service';
import type { QueueConsumer, QueueMessage } from '../../queue/types';
import type { TournamentDataCompletionService } from '../../osu/services/tournament-data-completion-service';
import type { Logger } from '../../logging/logger';

class StubQueue<T> implements QueueConsumer<T> {
  handler: ((message: QueueMessage<T>) => Promise<void>) | null = null;

  async start(handler: (message: QueueMessage<T>) => Promise<void>) {
    this.handler = handler;
  }

  async stop() {
    this.handler = null;
  }

  async emit(message: QueueMessage<T>) {
    if (!this.handler) {
      throw new Error('Queue handler not registered');
    }

    await this.handler(message);
  }
}

const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('TournamentAutomationCheckWorker', () => {
  const baseMessage: QueueMessage<ProcessTournamentAutomationCheckMessage> = {
    payload: {
      tournamentId: 123,
      overrideVerifiedState: false,
      correlationId: 'test-correlation',
      requestedAt: new Date().toISOString(),
      priority: MessagePriority.Normal,
    },
    metadata: {
      correlationId: 'test-correlation',
      priority: MessagePriority.Normal,
      requestedAt: new Date().toISOString(),
    },
    ack: async () => {},
    nack: async () => {},
  };

  it('acknowledges successful automation runs and clears pending state', async () => {
    const queue = new StubQueue<ProcessTournamentAutomationCheckMessage>();

    let processed = false;
    const service: Pick<
      TournamentAutomationCheckService,
      'processAutomationChecks'
    > = {
      async processAutomationChecks() {
        processed = true;
        return true;
      },
    };

    let clearedId: number | null = null;
    const dataCompletion: Pick<
      TournamentDataCompletionService,
      'clearPendingAutomationCheck'
    > = {
      clearPendingAutomationCheck(id) {
        clearedId = id;
      },
    };

    let acked = 0;
    let nacked = 0;

    const worker = new TournamentAutomationCheckWorker({
      queue,
      service: service as TournamentAutomationCheckService,
      dataCompletion: dataCompletion as TournamentDataCompletionService,
      logger: noopLogger,
    });

    await worker.start();

    await queue.emit({
      ...baseMessage,
      ack: async () => {
        acked += 1;
      },
      nack: async () => {
        nacked += 1;
      },
    });

    expect(processed).toBe(true);
    expect(acked).toBe(1);
    expect(nacked).toBe(0);
    expect(clearedId === 123).toBe(true);
  });

  it('requeues on failure and clears pending state', async () => {
    const queue = new StubQueue<ProcessTournamentAutomationCheckMessage>();

    const service: Pick<
      TournamentAutomationCheckService,
      'processAutomationChecks'
    > = {
      async processAutomationChecks() {
        throw new Error('boom');
      },
    };

    let cleared = 0;
    const dataCompletion: Pick<
      TournamentDataCompletionService,
      'clearPendingAutomationCheck'
    > = {
      clearPendingAutomationCheck() {
        cleared += 1;
      },
    };

    let acked = 0;
    let nacked = 0;

    const worker = new TournamentAutomationCheckWorker({
      queue,
      service: service as TournamentAutomationCheckService,
      dataCompletion: dataCompletion as TournamentDataCompletionService,
      logger: noopLogger,
    });

    await worker.start();

    await queue.emit({
      ...baseMessage,
      ack: async () => {
        acked += 1;
      },
      nack: async () => {
        nacked += 1;
      },
    });

    expect(acked).toBe(0);
    expect(nacked).toBe(1);
    expect(cleared).toBe(1);
  });
});
