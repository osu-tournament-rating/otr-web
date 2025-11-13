import { describe, expect, it } from 'bun:test';
import { MessagePriority, type FetchMatchMessage } from '@otr/core';

import type { QueueConsumer, QueueMessage } from '../../../queue/types';
import { MatchFetchWorker } from '../match-fetch-worker';
import { consoleLogger } from '../../../logging/logger';
import { MatchFetchService } from '../../services/match-fetch-service';

class StubQueue implements QueueConsumer<FetchMatchMessage> {
  private handler:
    | ((message: QueueMessage<FetchMatchMessage>) => Promise<void>)
    | null = null;

  async start(
    handler: (message: QueueMessage<FetchMatchMessage>) => Promise<void>
  ) {
    this.handler = handler;
  }

  async stop() {
    this.handler = null;
  }

  async emit(message: QueueMessage<FetchMatchMessage>) {
    if (!this.handler) {
      throw new Error('StubQueue.emit called before start');
    }

    await this.handler(message);
  }
}

describe('MatchFetchWorker', () => {
  it('acknowledges successful fetches', async () => {
    const queue = new StubQueue();

    let calledWith: { osuMatchId: number; isLazer: boolean } | undefined;

    const service: Pick<MatchFetchService, 'fetchAndPersist'> = {
      async fetchAndPersist(osuMatchId: number, isLazer: boolean) {
        calledWith = { osuMatchId, isLazer };
        return true;
      },
    };

    const worker = new MatchFetchWorker({
      queue,
      service,
      logger: consoleLogger,
    });

    await worker.start();

    let acked = 0;
    let nacked = 0;

    const message: QueueMessage<FetchMatchMessage> = {
      payload: {
        osuMatchId: 445566,
        isLazer: false,
        requestedAt: new Date().toISOString(),
        correlationId: 'match-correlation',
        priority: MessagePriority.Normal,
      },
      metadata: {
        requestedAt: new Date().toISOString(),
        correlationId: 'match-correlation',
        priority: MessagePriority.Normal,
      },
      ack: async () => {
        acked += 1;
      },
      nack: async () => {
        nacked += 1;
      },
    };

    await queue.emit(message);

    expect(calledWith).toEqual({ osuMatchId: 445566, isLazer: false });
    expect(acked).toBe(1);
    expect(nacked).toBe(0);

    await worker.stop();
  });

  it('nacks when the service throws', async () => {
    const queue = new StubQueue();

    const service: Pick<MatchFetchService, 'fetchAndPersist'> = {
      async fetchAndPersist() {
        throw new Error('boom');
      },
    };

    const worker = new MatchFetchWorker({
      queue,
      service,
      logger: consoleLogger,
    });

    await worker.start();

    let acked = 0;
    let nacked = 0;

    const message: QueueMessage<FetchMatchMessage> = {
      payload: {
        osuMatchId: 112233,
        isLazer: true,
        requestedAt: new Date().toISOString(),
        correlationId: 'match-error',
        priority: MessagePriority.Normal,
      },
      metadata: {
        requestedAt: new Date().toISOString(),
        correlationId: 'match-error',
        priority: MessagePriority.Normal,
      },
      ack: async () => {
        acked += 1;
      },
      nack: async () => {
        nacked += 1;
      },
    };

    await queue.emit(message).catch(() => undefined);

    expect(acked).toBe(0);
    expect(nacked).toBe(1);

    await worker.stop();
  });
});
