import { RabbitMqPublisher } from '@/lib/queue';
import type {
  QueueMessagePayload,
  QueuePublishOptions,
} from '@/lib/queue/types';
import { QueueConstants, type FetchPlayerOsuTrackMessage } from '@otr/core';

const amqpUrl = process.env.DATA_WORKER_AMQP_URL;

if (!amqpUrl) {
  throw new Error('DATA_WORKER_AMQP_URL is not configured');
}

const fetchPlayerOsuTrackPublisher = new RabbitMqPublisher<FetchPlayerOsuTrackMessage>({
  url: amqpUrl,
  queue: QueueConstants.osuTrack.players,
});

export const publishFetchPlayerOsuTrackMessage = (
  payload: QueueMessagePayload<FetchPlayerOsuTrackMessage>,
  options?: QueuePublishOptions
) => fetchPlayerOsuTrackPublisher.publish(payload, options);
