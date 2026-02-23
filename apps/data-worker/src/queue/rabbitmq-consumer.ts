import { type MessageEnvelope, QueuePriorityArguments } from '@otr/core';
import { connect, type ConsumeMessage } from 'amqplib';
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
}

type AmqpConnection = Awaited<ReturnType<typeof connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

export class RabbitMqConsumer<TPayload> implements QueueConsumer<TPayload> {
  private readonly options: RabbitMqConsumerOptions;
  private readonly logger: Logger;
  private connection: AmqpConnection | null = null;
  private channel: AmqpChannel | null = null;
  private consumerTag: string | null = null;

  constructor(options: RabbitMqConsumerOptions) {
    this.options = options;
    this.logger = options.logger ?? consoleLogger;
  }

  async start(handler: QueueMessageHandler<TPayload>): Promise<void> {
    if (this.connection) {
      throw new Error('RabbitMqConsumer.start called more than once');
    }

    const connection = await connect(this.options.url);
    const channel = await connection.createChannel();
    await channel.assertQueue(this.options.queue, {
      durable: true,
      arguments: { ...QueuePriorityArguments },
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

    const queueMessage: QueueMessage<TPayload> = {
      payload: envelope as unknown as TPayload,
      metadata: {
        requestedAt: envelope.requestedAt,
        correlationId: envelope.correlationId,
        priority: envelope.priority,
      },
      ack: async () => {
        this.channel?.ack(message);
      },
      nack: async (requeue = false) => {
        this.channel?.nack(message, false, requeue);
      },
    };

    const labels = { queue: this.options.queue };
    queueMessagesInFlight.labels(labels).inc();
    const startTime = Date.now();

    try {
      await handler(queueMessage);
      queueMessagesProcessed.labels({ ...labels, status: 'success' }).inc();
    } catch (error) {
      this.logger.error('Queue handler threw an error', { error });
      queueMessagesProcessed.labels({ ...labels, status: 'error' }).inc();
      await queueMessage.nack(true);
    } finally {
      queueMessagesInFlight.labels(labels).dec();
      queueMessageDuration
        .labels(labels)
        .observe((Date.now() - startTime) / 1000);
    }
  }
}
