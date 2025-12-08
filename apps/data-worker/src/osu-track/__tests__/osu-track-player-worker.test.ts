import { describe, expect, it } from 'bun:test';
import { type FetchPlayerOsuTrackMessage, MessagePriority } from '@otr/core';

import { OsuTrackClient } from '../client';
import { OsuTrackPlayerWorker } from '../worker';
import type { QueueConsumer, QueueMessage } from '../../queue/types';
import type { RateLimiter } from '../../rate-limiter';
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
  debug: () => {},
  child: () => noopLogger,
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
      fetchImpl,
    });

    const received: Array<{
      message: FetchPlayerOsuTrackMessage;
      results: Array<{ mode: number; updates: number }>;
    }> = [];

    const worker = new OsuTrackPlayerWorker({
      queue,
      client,
      rateLimiter,
      logger: noopLogger,
      onPlayer: async ({ message, results }) => {
        received.push({
          message,
          results: results.map((entry) => ({
            mode: entry.mode,
            updates: entry.updates.length,
          })),
        });
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

    expect(rateLimiter.calls).toBe(4);
    expect(acked).toBe(1);
    expect(nacked).toBe(0);
    expect(received).toHaveLength(1);
    expect(received[0]?.message.osuPlayerId).toBe(7654321);
    expect(received[0]?.results).toEqual([
      { mode: 0, updates: 1 },
      { mode: 1, updates: 1 },
      { mode: 2, updates: 1 },
      { mode: 3, updates: 1 },
    ]);

    await worker.stop();
  });
});
