import { describe, expect, it } from 'bun:test';
import { MessagePriority, type FetchBeatmapMessage } from '@otr/core';

import type { QueueConsumer, QueueMessage } from '../../../queue/types';
import { BeatmapFetchWorker } from '../beatmap-fetch-worker';
import { BeatmapFetchService } from '../../services/beatmap-fetch-service';
import { consoleLogger } from '../../../logging/logger';

class StubQueue implements QueueConsumer<FetchBeatmapMessage> {
  private handler:
    | ((message: QueueMessage<FetchBeatmapMessage>) => Promise<void>)
    | null = null;

  async start(
    handler: (message: QueueMessage<FetchBeatmapMessage>) => Promise<void>
  ) {
    this.handler = handler;
  }

  async stop() {
    this.handler = null;
  }

  async emit(message: QueueMessage<FetchBeatmapMessage>) {
    if (!this.handler) {
      throw new Error('StubQueue.emit called before start');
    }

    await this.handler(message);
  }
}

describe('BeatmapFetchWorker', () => {
  it('acknowledges messages when the service succeeds', async () => {
    const queue = new StubQueue();

    let calledWith: number | undefined;

    const service: Pick<BeatmapFetchService, 'fetchAndPersist'> = {
      async fetchAndPersist(beatmapId: number) {
        calledWith = beatmapId;
        return true;
      },
    };

    const worker = new BeatmapFetchWorker({
      queue,
      service,
      logger: consoleLogger,
    });

    await worker.start();

    let acked = 0;
    let nacked = 0;

    const message: QueueMessage<FetchBeatmapMessage> = {
      payload: {
        beatmapId: 12345,
        requestedAt: new Date().toISOString(),
        correlationId: 'test-correlation',
        priority: MessagePriority.Normal,
      },
      metadata: {
        requestedAt: new Date().toISOString(),
        correlationId: 'test-correlation',
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

    expect(calledWith).toBe(12345);
    expect(acked).toBe(1);
    expect(nacked).toBe(0);

    await worker.stop();
  });

  it('requeues on failure', async () => {
    const queue = new StubQueue();

    const service: Pick<BeatmapFetchService, 'fetchAndPersist'> = {
      async fetchAndPersist() {
        throw new Error('failed');
      },
    };

    const worker = new BeatmapFetchWorker({
      queue,
      service,
      logger: consoleLogger,
    });

    await worker.start();

    let acked = 0;
    let nacked = 0;

    const message: QueueMessage<FetchBeatmapMessage> = {
      payload: {
        beatmapId: 6789,
        requestedAt: new Date().toISOString(),
        correlationId: 'test-error',
        priority: MessagePriority.Normal,
      },
      metadata: {
        requestedAt: new Date().toISOString(),
        correlationId: 'test-error',
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
