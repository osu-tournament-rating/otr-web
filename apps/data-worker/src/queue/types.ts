import type { MessageMetadata } from '@otr/core';

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
