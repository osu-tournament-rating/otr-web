import { describe, expect, it } from 'bun:test';
import { MessagePriority, QueueRetryPolicy } from '@otr/core';
import type { ChannelModel, ConsumeMessage, Options } from 'amqplib';

import type { Logger } from '../../logging/logger';
import { deferIfMaintenanceWindow } from '../../maintenance/gate';
import { queueMessagesProcessed } from '../../metrics/queue-metrics';
import { RabbitMqConsumer } from '../rabbitmq-consumer';

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLogger,
};

class FakeChannel {
  asserted: Array<{ queue: string; options?: Options.AssertQueue }> = [];
  published: Array<{
    queue: string;
    content: Buffer;
    options?: Options.Publish;
  }> = [];
  acked: ConsumeMessage[] = [];
  nacked: Array<{ message: ConsumeMessage; requeue?: boolean }> = [];
  confirmError: Error | null = null;
  private onMessage: ((message: ConsumeMessage | null) => unknown) | null =
    null;

  async assertQueue(queue: string, options?: Options.AssertQueue) {
    this.asserted.push({ queue, options });
    return { queue, messageCount: 0, consumerCount: 0 };
  }

  async prefetch() {}

  async consume(
    _queue: string,
    onMessage: (message: ConsumeMessage | null) => unknown
  ) {
    this.onMessage = onMessage;
    return { consumerTag: 'consumer-tag' };
  }

  sendToQueue(queue: string, content: Buffer, options?: Options.Publish) {
    this.published.push({ queue, content, options });
    return true;
  }

  async waitForConfirms() {
    if (this.confirmError) {
      throw this.confirmError;
    }
  }

  ack(message: ConsumeMessage) {
    this.acked.push(message);
  }

  nack(message: ConsumeMessage, _allUpTo?: boolean, requeue?: boolean) {
    this.nacked.push({ message, requeue });
  }

  async cancel() {}
  async close() {}
  on() {
    return this;
  }
  once() {
    return this;
  }

  async deliver(message: ConsumeMessage) {
    if (!this.onMessage) {
      throw new Error('FakeChannel.deliver called before consume');
    }
    await this.onMessage(message);
  }
}

const createConnection = (channel: FakeChannel) =>
  ({
    createChannel: async () => channel,
    createConfirmChannel: async () => channel,
    close: async () => {},
    on: () => {},
    once: () => {},
  }) as unknown as ChannelModel;

const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

const createMessage = (
  queue: string,
  headers: Record<string, unknown> = {}
): ConsumeMessage => ({
  content: Buffer.from(
    JSON.stringify({
      requestedAt: '2026-09-30T00:00:00.000Z',
      correlationId: 'correlation-1',
      priority: MessagePriority.High,
      tournamentId: 42,
    })
  ),
  fields: {
    deliveryTag: 1,
    redelivered: false,
    exchange: '',
    routingKey: queue,
    consumerTag: 'consumer-tag',
  },
  properties: {
    contentType: 'application/json',
    contentEncoding: undefined,
    headers: { traceparent, ...headers },
    deliveryMode: 2,
    priority: MessagePriority.High,
    correlationId: undefined,
    replyTo: undefined,
    expiration: undefined,
    messageId: 'message-1',
    timestamp: undefined,
    type: undefined,
    userId: undefined,
    appId: undefined,
    clusterId: undefined,
  },
});

const startConsumer = async (
  queue: string,
  handler: Parameters<RabbitMqConsumer<unknown>['start']>[0]
) => {
  const channel = new FakeChannel();
  const consumer = new RabbitMqConsumer<unknown>({
    url: 'amqp://unused',
    queue,
    logger: noopLogger,
    connectionFactory: async () => createConnection(channel),
  });
  await consumer.start(handler);
  return channel;
};

const processedCount = async (queue: string, status: string) => {
  const { values } = await queueMessagesProcessed.get();
  return (
    values.find(
      (entry) => entry.labels.queue === queue && entry.labels.status === status
    )?.value ?? 0
  );
};

const failingHandler = async () => {
  throw new Error('handler failed');
};

describe('RabbitMqConsumer', () => {
  it('declares a delayed retry queue that flows back and a parking queue', async () => {
    const channel = await startConsumer('test.declare', async () => {});

    expect(channel.asserted).toContainEqual({
      queue: 'test.declare.retry',
      options: {
        durable: true,
        arguments: {
          'x-message-ttl': QueueRetryPolicy.retryDelayMs,
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': 'test.declare',
        },
      },
    });
    expect(channel.asserted).toContainEqual({
      queue: 'test.declare.failed',
      options: { durable: true },
    });
  });

  it('acks a message the handler processes', async () => {
    const channel = await startConsumer('test.success', async (message) => {
      await message.ack();
    });
    const message = createMessage('test.success');

    await channel.deliver(message);

    expect(channel.acked).toEqual([message]);
    expect(channel.nacked).toEqual([]);
    expect(channel.published).toEqual([]);
  });

  it('republishes a first failure to the retry queue, then acks', async () => {
    const channel = await startConsumer('test.retry', failingHandler);
    const message = createMessage('test.retry');

    await channel.deliver(message);

    expect(channel.published).toHaveLength(1);
    const [published] = channel.published;
    expect(published?.queue).toBe('test.retry.retry');
    expect(published?.content).toEqual(message.content);
    expect(published?.options).toMatchObject({
      contentType: 'application/json',
      deliveryMode: 2,
      priority: MessagePriority.High,
      messageId: 'message-1',
      headers: { traceparent, [QueueRetryPolicy.attemptHeader]: 1 },
    });
    expect(channel.acked).toEqual([message]);
    expect(channel.nacked).toEqual([]);
  });

  it('drops broker dead-letter history when republishing a retried message', async () => {
    const channel = await startConsumer('test.death', failingHandler);
    const message = createMessage('test.death', {
      [QueueRetryPolicy.attemptHeader]: 2,
      'x-death': [{ count: 2, reason: 'expired', queue: 'test.death.retry' }],
      'x-first-death-queue': 'test.death.retry',
      'x-last-death-queue': 'test.death.retry',
    });

    await channel.deliver(message);

    expect(channel.published[0]?.options?.headers).toEqual({
      traceparent,
      [QueueRetryPolicy.attemptHeader]: 3,
    });
  });

  it('parks a message that fails its final attempt, then acks', async () => {
    const queue = 'test.park';
    const channel = await startConsumer(queue, failingHandler);
    const message = createMessage(queue, {
      [QueueRetryPolicy.attemptHeader]: QueueRetryPolicy.maxAttempts - 1,
    });

    await channel.deliver(message);

    expect(channel.published).toHaveLength(1);
    expect(channel.published[0]?.queue).toBe('test.park.failed');
    expect(channel.published[0]?.options).toMatchObject({
      priority: MessagePriority.High,
      headers: {
        traceparent,
        [QueueRetryPolicy.attemptHeader]: QueueRetryPolicy.maxAttempts,
      },
    });
    expect(channel.acked).toEqual([message]);
    expect(await processedCount(queue, 'parked')).toBe(1);
  });

  it('requeues the original when the republish is not confirmed', async () => {
    const channel = await startConsumer('test.unconfirmed', failingHandler);
    channel.confirmError = new Error('publish nacked');
    const message = createMessage('test.unconfirmed');

    await channel.deliver(message);

    expect(channel.acked).toEqual([]);
    expect(channel.nacked).toEqual([{ message, requeue: true }]);
  });

  it('requeues a maintenance deferral without consuming an attempt', async () => {
    const channel = await startConsumer('test.maintenance', async (message) => {
      await deferIfMaintenanceWindow({
        enabled: true,
        message,
        logger: noopLogger,
        now: new Date('2026-06-02T12:00:00.000Z'),
        delayMs: 0,
      });
    });
    const message = createMessage('test.maintenance');

    await channel.deliver(message);

    expect(channel.nacked).toEqual([{ message, requeue: true }]);
    expect(channel.acked).toEqual([]);
    expect(channel.published).toEqual([]);
  });

  it('does not republish a message the handler settled before throwing', async () => {
    const channel = await startConsumer('test.settled', async (message) => {
      await message.ack();
      throw new Error('failed after ack');
    });
    const message = createMessage('test.settled');

    await channel.deliver(message);

    expect(channel.acked).toEqual([message]);
    expect(channel.nacked).toEqual([]);
    expect(channel.published).toEqual([]);
  });
});
