import { describe, expect, it } from 'bun:test';
import { MessagePriority, type FetchPlayerMessage } from '@otr/core';

import type { QueueConsumer, QueueMessage } from '../../../queue/types';
import { PlayerFetchWorker } from '../player-fetch-worker';
import { PlayerFetchService } from '../../services/player-fetch-service';
import { consoleLogger } from '../../../logging/logger';

class StubQueue implements QueueConsumer<FetchPlayerMessage> {
  private handler:
    | ((message: QueueMessage<FetchPlayerMessage>) => Promise<void>)
    | null = null;

  async start(
    handler: (message: QueueMessage<FetchPlayerMessage>) => Promise<void>
  ) {
    this.handler = handler;
  }

  async stop() {
    this.handler = null;
  }

  async emit(message: QueueMessage<FetchPlayerMessage>) {
    if (!this.handler) {
      throw new Error('StubQueue.emit called before start');
    }

    await this.handler(message);
  }
}

describe('PlayerFetchWorker', () => {
  it('acknowledges successful fetches', async () => {
    const queue = new StubQueue();

    let calledWith: number | undefined;

    const service: Pick<PlayerFetchService, 'fetchAndPersist'> = {
      async fetchAndPersist(osuPlayerId: number) {
        calledWith = osuPlayerId;
        return true;
      },
    };

    const worker = new PlayerFetchWorker({
      queue,
      service,
      logger: consoleLogger,
    });

    await worker.start();

    let acked = 0;
    let nacked = 0;

    const message: QueueMessage<FetchPlayerMessage> = {
      payload: {
        osuPlayerId: 777,
        requestedAt: new Date().toISOString(),
        correlationId: 'player-correlation',
        priority: MessagePriority.Normal,
      },
      metadata: {
        requestedAt: new Date().toISOString(),
        correlationId: 'player-correlation',
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

    expect(calledWith).toBe(777);
    expect(acked).toBe(1);
    expect(nacked).toBe(0);

    await worker.stop();
  });

  it('requeues on error', async () => {
    const queue = new StubQueue();

    const service: Pick<PlayerFetchService, 'fetchAndPersist'> = {
      async fetchAndPersist() {
        throw new Error('player-error');
      },
    };

    const worker = new PlayerFetchWorker({
      queue,
      service,
      logger: consoleLogger,
    });

    await worker.start();

    let acked = 0;
    let nacked = 0;

    const message: QueueMessage<FetchPlayerMessage> = {
      payload: {
        osuPlayerId: 888,
        requestedAt: new Date().toISOString(),
        correlationId: 'player-error',
        priority: MessagePriority.Normal,
      },
      metadata: {
        requestedAt: new Date().toISOString(),
        correlationId: 'player-error',
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
