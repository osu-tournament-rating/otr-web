import { describe, expect, it } from 'bun:test';
import { MessagePriority, type ProcessTournamentStatsMessage } from '@otr/core';

import type { QueueConsumer, QueueMessage } from '@otr/core/queues';
import type { Logger } from '../../logging/logger';
import { TournamentStatsWorker } from '../tournament-stats-worker';
import type { TournamentStatsService } from '../tournament-stats-service';

class StubQueue implements QueueConsumer<ProcessTournamentStatsMessage> {
  handler:
    | ((message: QueueMessage<ProcessTournamentStatsMessage>) => Promise<void>)
    | null = null;

  async start(
    handler: (
      message: QueueMessage<ProcessTournamentStatsMessage>
    ) => Promise<void>
  ) {
    this.handler = handler;
  }

  async stop() {
    this.handler = null;
  }

  async emit(message: QueueMessage<ProcessTournamentStatsMessage>) {
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
  debug: () => {},
  child: () => noopLogger,
};

const baseMessage: QueueMessage<ProcessTournamentStatsMessage> = {
  payload: {
    tournamentId: 5,
    correlationId: 'corr-id',
    requestedAt: new Date().toISOString(),
    priority: MessagePriority.Normal,
  },
  metadata: {
    correlationId: 'corr-id',
    requestedAt: new Date().toISOString(),
    priority: MessagePriority.Normal,
  },
  ack: async () => {},
  nack: async () => {},
};

describe('TournamentStatsWorker', () => {
  it('acknowledges messages on success', async () => {
    const queue = new StubQueue();
    let processCalls = 0;
    const service: Pick<TournamentStatsService, 'processTournamentStats'> = {
      async processTournamentStats() {
        processCalls += 1;
        return true;
      },
    };

    let acked = 0;
    let nacked = 0;

    const worker = new TournamentStatsWorker({
      queue,
      service: service as TournamentStatsService,
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

    expect(processCalls).toBe(1);
    expect(acked).toBe(1);
    expect(nacked).toBe(0);
  });

  it('still acknowledges when processing fails', async () => {
    const queue = new StubQueue();
    const service: Pick<TournamentStatsService, 'processTournamentStats'> = {
      async processTournamentStats() {
        return false;
      },
    };

    let acked = 0;
    let nacked = 0;

    const worker = new TournamentStatsWorker({
      queue,
      service: service as TournamentStatsService,
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

    expect(acked).toBe(1);
    expect(nacked).toBe(0);
  });

  it('requeues the message when processing throws', async () => {
    const queue = new StubQueue();
    const service: Pick<TournamentStatsService, 'processTournamentStats'> = {
      async processTournamentStats() {
        throw new Error('boom');
      },
    };

    let acked = 0;
    let nacked = 0;

    const worker = new TournamentStatsWorker({
      queue,
      service: service as TournamentStatsService,
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
  });
});
