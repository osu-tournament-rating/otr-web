import type { MessageEnvelope, MessageMetadata } from '@otr/core';

export type QueueMessagePayload<
  TMessage extends MessageEnvelope<Record<string, unknown>>,
> = Omit<TMessage, keyof MessageMetadata>;

export interface QueuePublishOptions {
  metadata?: Partial<MessageMetadata>;
}

export interface QueuePublisher<
  TMessage extends MessageEnvelope<Record<string, unknown>>,
> {
  publish(
    payload: QueueMessagePayload<TMessage>,
    options?: QueuePublishOptions
  ): Promise<TMessage>;
  close(): Promise<void>;
}
