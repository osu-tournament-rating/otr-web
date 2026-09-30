import {
  type MessageEnvelope,
  QueuePriorityArguments,
  QueueRetryPolicy,
  failedQueueName,
  retryQueueName,
} from '@otr/core';
import { traceConsume } from '@otr/core/tracing';
import {
  connect,
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
  type MessageProperties,
  type Options,
} from 'amqplib';
import { consoleLogger, type Logger } from '../logging/logger';
import {
  queueMessagesProcessed,
  queueMessageDuration,
  queueMessagesInFlight,
} from '../metrics/queue-metrics';
import type {
  QueueConsumer,
  QueueMessage,
  QueueMessageHandler,
} from '@otr/core/queues';

export interface RabbitMqConsumerOptions {
  url: string;
  queue: string;
  prefetch?: number;
  logger?: Logger;
  connectionFactory?: () => Promise<ChannelModel>;
}

export class RabbitMqConsumer<TPayload> implements QueueConsumer<TPayload> {
  private readonly options: RabbitMqConsumerOptions;
  private readonly logger: Logger;
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private consumerTag: string | null = null;

  constructor(options: RabbitMqConsumerOptions) {
    this.options = options;
    this.logger = options.logger ?? consoleLogger;
  }

  async start(handler: QueueMessageHandler<TPayload>): Promise<void> {
    if (this.connection) {
      throw new Error('RabbitMqConsumer.start called more than once');
    }

    const connection = await (this.options.connectionFactory?.() ??
      connect(this.options.url));
    // One confirm channel both consumes and republishes failures, so a
    // republish is confirmed before the original delivery is acked.
    const channel = await connection.createConfirmChannel();
    await channel.assertQueue(this.options.queue, {
      durable: true,
      arguments: { ...QueuePriorityArguments },
    });
    // No x-max-priority here: classic priority queues expire messages only at
    // the head of each priority level, so a low-priority retry could wait past
    // its delay behind a newer high-priority one. The priority property rides
    // along unchanged and the main queue honors it after dead-lettering.
    await channel.assertQueue(retryQueueName(this.options.queue), {
      durable: true,
      arguments: {
        'x-message-ttl': QueueRetryPolicy.retryDelayMs,
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': this.options.queue,
      },
    });
    await channel.assertQueue(failedQueueName(this.options.queue), {
      durable: true,
    });
    await channel.prefetch(this.options.prefetch ?? 1);

    this.connection = connection;
    this.channel = channel;

    const consumer = await channel.consume(
      this.options.queue,
      (message) =>
        this.handleMessage(message, handler).catch((error) => {
          this.logger.error('Unhandled queue message error', { error });
        }),
      { noAck: false }
    );

    this.consumerTag = consumer.consumerTag;
    this.logger.info('Subscribed to queue', { queue: this.options.queue });
  }

  async stop(): Promise<void> {
    if (!this.connection || !this.channel) {
      return;
    }

    if (this.consumerTag) {
      await this.channel.cancel(this.consumerTag);
    }

    await this.channel.close();
    await this.connection.close();

    this.channel = null;
    this.connection = null;
    this.consumerTag = null;
  }

  private async handleMessage(
    message: ConsumeMessage | null,
    handler: QueueMessageHandler<TPayload>
  ) {
    if (!message) {
      return;
    }

    if (!this.channel) {
      this.logger.error('Channel unavailable while handling message');
      return;
    }

    let envelope: MessageEnvelope<unknown>;

    try {
      envelope = JSON.parse(message.content.toString());
    } catch (error) {
      this.logger.error('Failed to parse queue message', {
        error,
        content: message.content.toString('utf-8'),
      });
      this.channel.nack(message, false, false);
      return;
    }

    const channel = this.channel;
    let settled = false;
    const queueMessage: QueueMessage<TPayload> = {
      payload: envelope as unknown as TPayload,
      metadata: {
        requestedAt: envelope.requestedAt,
        correlationId: envelope.correlationId,
        priority: envelope.priority,
      },
      ack: async () => {
        settled = true;
        channel.ack(message);
      },
      nack: async (requeue = false) => {
        settled = true;
        channel.nack(message, false, requeue);
      },
    };

    const labels = { queue: this.options.queue };
    queueMessagesInFlight.labels(labels).inc();
    const startTime = Date.now();

    try {
      await traceConsume(this.options.queue, message.properties.headers, () =>
        handler(queueMessage)
      );
      queueMessagesProcessed.labels({ ...labels, status: 'success' }).inc();
    } catch (error) {
      if (settled) {
        this.logger.error('Queue handler threw after settling its message', {
          queue: this.options.queue,
          correlationId: envelope.correlationId,
          error,
        });
        queueMessagesProcessed.labels({ ...labels, status: 'error' }).inc();
      } else {
        await this.retryOrPark(channel, message, envelope, error);
      }
    } finally {
      queueMessagesInFlight.labels(labels).dec();
      queueMessageDuration
        .labels(labels)
        .observe((Date.now() - startTime) / 1000);
    }
  }

  /** Republishes a failed message to the retry or parking queue, then acks it. */
  private async retryOrPark(
    channel: ConfirmChannel,
    message: ConsumeMessage,
    envelope: MessageEnvelope<unknown>,
    error: unknown
  ) {
    const queue = this.options.queue;
    const attempts = readAttempt(message.properties.headers) + 1;
    const park = attempts >= QueueRetryPolicy.maxAttempts;
    const target = park ? failedQueueName(queue) : retryQueueName(queue);
    const context = {
      queue,
      correlationId: envelope.correlationId,
      attempts,
      error,
    };

    try {
      channel.sendToQueue(
        target,
        message.content,
        republishOptions(message.properties, attempts)
      );
      await channel.waitForConfirms();
    } catch (publishError) {
      this.logger.error(
        'Failed to republish a failed queue message; requeued',
        {
          ...context,
          target,
          publishError,
        }
      );
      queueMessagesProcessed.labels({ queue, status: 'error' }).inc();
      channel.nack(message, false, true);
      return;
    }

    channel.ack(message);

    if (park) {
      this.logger.error('Parked queue message after its final attempt', {
        ...context,
        target,
      });
      queueMessagesProcessed.labels({ queue, status: 'parked' }).inc();
    } else {
      this.logger.warn('Queue message failed; scheduled a delayed retry', {
        ...context,
        target,
        retryDelayMs: QueueRetryPolicy.retryDelayMs,
      });
      queueMessagesProcessed.labels({ queue, status: 'error' }).inc();
    }
  }
}

const readAttempt = (headers: MessageProperties['headers']): number => {
  const attempt = Number(headers?.[QueueRetryPolicy.attemptHeader] ?? 0);
  return Number.isInteger(attempt) && attempt > 0 ? attempt : 0;
};

// Not copied: x-death history belongs to the broker, a per-message expiration
// would silently drop a parked message, and userId must match this connection.
const brokerOwnedHeader = /^x-(death|first-death-|last-death-)/;

const republishOptions = (
  properties: MessageProperties,
  attempt: number
): Options.Publish => {
  const headers = Object.fromEntries(
    Object.entries(properties.headers ?? {}).filter(
      ([key]) => !brokerOwnedHeader.test(key)
    )
  );

  return {
    contentType: properties.contentType,
    contentEncoding: properties.contentEncoding,
    deliveryMode: properties.deliveryMode,
    priority: properties.priority,
    correlationId: properties.correlationId,
    replyTo: properties.replyTo,
    messageId: properties.messageId,
    timestamp: properties.timestamp,
    type: properties.type,
    appId: properties.appId,
    headers: { ...headers, [QueueRetryPolicy.attemptHeader]: attempt },
  };
};
