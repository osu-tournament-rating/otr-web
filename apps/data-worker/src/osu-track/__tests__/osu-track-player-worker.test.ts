import { describe, expect, it } from 'bun:test';
import { type FetchPlayerOsuTrackMessage, MessagePriority } from '@otr/core';

import { OsuTrackClient } from '../client';
import { OsuTrackPlayerWorker } from '../worker';
import type { QueueConsumer, QueueMessage } from '../../queue/types';
import type { RateLimiter } from '../rate-limiter';
import type { Logger } from '../../logging/logger';

class StubRateLimiter implements RateLimiter {
  public calls = 0;

  async schedule<T>(task: () => Promise<T>): Promise<T> {
    this.calls += 1;
    return task();
  }
}

class TestQueue implements QueueConsumer<FetchPlayerOsuTrackMessage> {
  private handler:
    | ((message: QueueMessage<FetchPlayerOsuTrackMessage>) => Promise<void>)
    | null = null;

  async start(
    handler: (
      message: QueueMessage<FetchPlayerOsuTrackMessage>
    ) => Promise<void>
  ) {
    this.handler = handler;
  }

  async stop() {
    this.handler = null;
  }

  async emit(message: QueueMessage<FetchPlayerOsuTrackMessage>) {
    if (!this.handler) {
      throw new Error('TestQueue.emit called before start');
    }

    await this.handler(message);
  }
}

const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('OsuTrackPlayerWorker', () => {
  it('processes queue messages and emits parsed updates', async () => {
    const queue = new TestQueue();
    const rateLimiter = new StubRateLimiter();

    const fetchImpl = async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify([
          {
            count300: '15',
            count100: '2',
            count50: '1',
            playcount: '120',
            ranked_score: '123456',
            total_score: '789012',
            pp_rank: '3456',
            level: '88.4',
            pp_raw: '5123.45',
            accuracy: '98.11',
            count_rank_ss: '3',
            count_rank_s: '10',
            count_rank_a: '20',
            timestamp: '2024-03-15T12:34:56.000Z',
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );

    const client = new OsuTrackClient({
      baseUrl: 'https://osutrack-api.ameo.dev',
      fetchImpl,
    });

    const receivedUpdates: Array<{
      message: FetchPlayerOsuTrackMessage;
      stats: number;
    }> = [];

    const worker = new OsuTrackPlayerWorker({
      queue,
      client,
      rateLimiter,
      logger: noopLogger,
      onUpdates: async ({ message, updates }) => {
        receivedUpdates.push({ message, stats: updates[0]?.rank ?? -1 });
      },
    });

    await worker.start();

    let acked = 0;
    let nacked = 0;

    const message: QueueMessage<FetchPlayerOsuTrackMessage> = {
      payload: {
        osuPlayerId: 7654321,
        requestedAt: '2024-03-15T12:00:00.000Z',
        correlationId: 'test-correlation',
        priority: MessagePriority.Normal,
      },
      metadata: {
        requestedAt: '2024-03-15T12:00:00.000Z',
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

    expect(rateLimiter.calls).toBe(1);
    expect(acked).toBe(1);
    expect(nacked).toBe(0);
    expect(receivedUpdates).toHaveLength(1);
    expect(receivedUpdates[0]?.message.osuPlayerId).toBe(7654321);
    expect(receivedUpdates[0]?.stats).toBe(3456);

    await worker.stop();
  });
});
