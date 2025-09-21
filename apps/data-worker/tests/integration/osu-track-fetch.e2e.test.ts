import { describe, expect, it } from 'bun:test';
import {
  type FetchPlayerOsuTrackMessage,
  type UserStatUpdate,
  MessagePriority,
} from '@otr/core';

import { FixedIntervalRateLimiter } from '../../src/osu-track/rate-limiter';
import { OsuTrackClient } from '../../src/osu-track/client';
import { OsuTrackPlayerWorker } from '../../src/osu-track/worker';
import type { QueueConsumer, QueueMessage } from '../../src/queue/types';
import type { Logger } from '../../src/logging/logger';

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

describe('osu!track end-to-end', () => {
  it('fetches stats history and acknowledges messages', async () => {
    const requests: URL[] = [];
    const responseBody = [
      {
        count300: '42',
        count100: '10',
        count50: '2',
        playcount: '300',
        ranked_score: '1234567',
        total_score: '2345678',
        pp_rank: '789',
        level: '99.12',
        pp_raw: '6543.21',
        accuracy: '97.5',
        count_rank_ss: '5',
        count_rank_s: '12',
        count_rank_a: '30',
        timestamp: '2024-05-01T01:02:03.000Z',
      },
    ];

    const queue = new TestQueue();
    const rateLimiter = new FixedIntervalRateLimiter(60);
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      );
      requests.push(url);

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const client = new OsuTrackClient({
      baseUrl: 'https://osutrack.test',
      fetchImpl,
    });

    let acked = 0;
    let nacked = 0;

    let processedResolve: (() => void) | null = null;
    const processed = new Promise<void>((resolve) => {
      processedResolve = resolve;
    });

    let received: {
      message: FetchPlayerOsuTrackMessage;
      updateCount: number;
      update: UserStatUpdate;
    } | null = null;

    const worker = new OsuTrackPlayerWorker({
      queue,
      client,
      rateLimiter,
      logger: noopLogger,
      onUpdates: async ({ message, updates }) => {
        const first = updates[0];
        received = first
          ? {
              message,
              updateCount: updates.length,
              update: first,
            }
          : null;
        processedResolve?.();
      },
    });

    await worker.start();

    const message: QueueMessage<FetchPlayerOsuTrackMessage> = {
      payload: {
        osuPlayerId: 19351718,
        requestedAt: '2024-05-01T00:00:00.000Z',
        correlationId: 'test-correlation',
        priority: MessagePriority.Normal,
      },
      metadata: {
        requestedAt: '2024-05-01T00:00:00.000Z',
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

    try {
      await queue.emit(message);
      await processed;

      expect(requests).toHaveLength(1);
      expect(requests[0]?.pathname).toBe('/stats_history');
      expect(requests[0]?.searchParams.get('user')).toBe('19351718');
      expect(requests[0]?.searchParams.get('mode')).toBe('0');

      expect(acked).toBe(1);
      expect(nacked).toBe(0);
      expect(received).not.toBeNull();
      expect(received!.updateCount).toBe(1);
      expect(received!.update.playCount).toBe(300);
      expect(received!.update.totalScore).toBe(2345678);
      expect(received!.update.rankedScore).toBe(1234567);
      expect(received!.update.rank).toBe(789);
      expect(received!.update.accuracy).toBeCloseTo(97.5);
      expect(received!.update.level).toBeCloseTo(99.12);
      expect(received!.update.pp).toBeCloseTo(6543.21);
      expect(received!.update.count300).toBe(42);
      expect(received!.update.count100).toBe(10);
      expect(received!.update.count50).toBe(2);
      expect(received!.update.countSs).toBe(5);
      expect(received!.update.countS).toBe(12);
      expect(received!.update.countA).toBe(30);
      expect(received!.update.timestamp.toISOString()).toBe(
        '2024-05-01T01:02:03.000Z'
      );
    } finally {
      await worker.stop();
    }
  });
});
