import type { MessageEnvelope, MessageMetadata } from '@otr/core';

export type QueueMessagePayload<TMessage> =
  TMessage extends MessageEnvelope<infer P>
    ? P
    : Omit<TMessage, keyof MessageMetadata>;

export interface QueueMessage<TPayload> {
  payload: TPayload;
  metadata: MessageMetadata;
  ack(): Promise<void>;
  nack(requeue?: boolean): Promise<void>;
}

export type QueueMessageHandler<TPayload> = (
  message: QueueMessage<TPayload>
) => Promise<void>;

export interface QueueConsumer<TPayload> {
  start(handler: QueueMessageHandler<TPayload>): Promise<void>;
  stop(): Promise<void>;
}

export interface QueuePublishOptions {
  metadata?: Partial<MessageMetadata>;
}

export interface QueuePublisher<TMessage> {
  publish(
    payload: QueueMessagePayload<TMessage>,
    options?: QueuePublishOptions
  ): Promise<TMessage>;
  close(): Promise<void>;
}
