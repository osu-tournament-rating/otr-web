import { RabbitMqPublisher } from '@/lib/queue';
import type {
  QueueMessagePayload,
  QueuePublishOptions,
  QueuePublisher,
} from '@/lib/queue/types';
import {
  QueueConstants,
  type FetchBeatmapMessage,
  type FetchMatchMessage,
  type FetchPlayerOsuTrackMessage,
  type ProcessTournamentAutomationCheckMessage,
} from '@otr/core';

export interface QueuePublisherRegistry {
  fetchBeatmap: QueuePublisher<FetchBeatmapMessage>['publish'];
  fetchMatch: QueuePublisher<FetchMatchMessage>['publish'];
  fetchPlayerOsuTrack: QueuePublisher<FetchPlayerOsuTrackMessage>['publish'];
  processAutomationCheck: QueuePublisher<ProcessTournamentAutomationCheckMessage>['publish'];
}

let overridePublishers: QueuePublisherRegistry | null = null;
let defaultPublishers: QueuePublisherRegistry | null = null;

const createDefaultPublishers = (): QueuePublisherRegistry => {
  const amqpUrl = process.env.DATA_WORKER_AMQP_URL;

  if (!amqpUrl) {
    throw new Error('DATA_WORKER_AMQP_URL is not configured');
  }

  const beatmapPublisher = new RabbitMqPublisher<FetchBeatmapMessage>({
    url: amqpUrl,
    queue: QueueConstants.osu.beatmaps,
  });

  const matchPublisher = new RabbitMqPublisher<FetchMatchMessage>({
    url: amqpUrl,
    queue: QueueConstants.osu.matches,
  });

  const osuTrackPublisher = new RabbitMqPublisher<FetchPlayerOsuTrackMessage>({
    url: amqpUrl,
    queue: QueueConstants.osuTrack.players,
  });

  const automationPublisher =
    new RabbitMqPublisher<ProcessTournamentAutomationCheckMessage>({
      url: amqpUrl,
      queue: QueueConstants.automatedChecks.tournaments,
    });

  return {
    fetchBeatmap: (payload, options) =>
      beatmapPublisher.publish(payload, options),
    fetchMatch: (payload, options) => matchPublisher.publish(payload, options),
    fetchPlayerOsuTrack: (payload, options) =>
      osuTrackPublisher.publish(payload, options),
    processAutomationCheck: (payload, options) =>
      automationPublisher.publish(payload, options),
  };
};

const getQueuePublishers = (): QueuePublisherRegistry => {
  if (overridePublishers) {
    return overridePublishers;
  }

  if (!defaultPublishers) {
    defaultPublishers = createDefaultPublishers();
  }

  return defaultPublishers;
};

export const publishFetchBeatmapMessage = (
  payload: QueueMessagePayload<FetchBeatmapMessage>,
  options?: QueuePublishOptions
) => getQueuePublishers().fetchBeatmap(payload, options);

export const publishFetchMatchMessage = (
  payload: QueueMessagePayload<FetchMatchMessage>,
  options?: QueuePublishOptions
) => getQueuePublishers().fetchMatch(payload, options);

export const publishFetchPlayerOsuTrackMessage = (
  payload: QueueMessagePayload<FetchPlayerOsuTrackMessage>,
  options?: QueuePublishOptions
) => getQueuePublishers().fetchPlayerOsuTrack(payload, options);

export const publishProcessTournamentAutomationCheckMessage = (
  payload: QueueMessagePayload<ProcessTournamentAutomationCheckMessage>,
  options?: QueuePublishOptions
) => getQueuePublishers().processAutomationCheck(payload, options);

export const setQueuePublishersForTesting = (
  publishers: QueuePublisherRegistry | null
) => {
  overridePublishers = publishers;
};

export const resetQueuePublishersForTesting = () => {
  overridePublishers = null;
};
