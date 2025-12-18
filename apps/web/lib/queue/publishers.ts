import { RabbitMqPublisher } from '@/lib/queue';
import type { QueuePublishOptions, QueuePublisher } from '@/lib/queue/types';
import {
  QueueConstants,
  type FetchBeatmapPayload,
  type FetchMatchPayload,
  type FetchOsuMessage,
  type FetchPlayerPayload,
  type FetchPlayerOsuTrackMessage,
  type ProcessTournamentAutomationCheckMessage,
} from '@otr/core';

/**
 * Public API payload types - omit `type` field since it's added internally.
 */
type FetchBeatmapInput = Omit<FetchBeatmapPayload, 'type'>;
type FetchMatchInput = Omit<FetchMatchPayload, 'type'>;
type FetchPlayerInput = Omit<FetchPlayerPayload, 'type'>;

export interface QueuePublisherRegistry {
  fetchBeatmap: (
    payload: FetchBeatmapInput,
    options?: QueuePublishOptions
  ) => Promise<FetchOsuMessage>;
  fetchMatch: (
    payload: FetchMatchInput,
    options?: QueuePublishOptions
  ) => Promise<FetchOsuMessage>;
  fetchPlayer: (
    payload: FetchPlayerInput,
    options?: QueuePublishOptions
  ) => Promise<FetchOsuMessage>;
  fetchPlayerOsuTrack: QueuePublisher<FetchPlayerOsuTrackMessage>['publish'];
  processAutomationCheck: QueuePublisher<ProcessTournamentAutomationCheckMessage>['publish'];
}

let overridePublishers: QueuePublisherRegistry | null = null;
let defaultPublishers: QueuePublisherRegistry | null = null;

const createDefaultPublishers = (): QueuePublisherRegistry => {
  const amqpUrl = process.env.RABBITMQ_AMQP_URL;

  if (!amqpUrl) {
    throw new Error('RABBITMQ_AMQP_URL is not configured');
  }

  const osuPublisher = new RabbitMqPublisher<FetchOsuMessage>({
    url: amqpUrl,
    queue: QueueConstants.osu,
  });

  const osuTrackPublisher = new RabbitMqPublisher<FetchPlayerOsuTrackMessage>({
    url: amqpUrl,
    queue: QueueConstants.osuTrack,
  });

  const automationPublisher =
    new RabbitMqPublisher<ProcessTournamentAutomationCheckMessage>({
      url: amqpUrl,
      queue: QueueConstants.automatedChecks.tournaments,
    });

  return {
    fetchBeatmap: (payload, options) =>
      osuPublisher.publish({ type: 'beatmap', ...payload }, options),
    fetchMatch: (payload, options) =>
      osuPublisher.publish({ type: 'match', ...payload }, options),
    fetchPlayer: (payload, options) =>
      osuPublisher.publish({ type: 'player', ...payload }, options),
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
  payload: FetchBeatmapInput,
  options?: QueuePublishOptions
) => getQueuePublishers().fetchBeatmap(payload, options);

export const publishFetchMatchMessage = (
  payload: FetchMatchInput,
  options?: QueuePublishOptions
) => getQueuePublishers().fetchMatch(payload, options);

export const publishFetchPlayerMessage = (
  payload: FetchPlayerInput,
  options?: QueuePublishOptions
) => getQueuePublishers().fetchPlayer(payload, options);

export const publishFetchPlayerOsuTrackMessage = (
  payload: { osuPlayerId: number },
  options?: QueuePublishOptions
) => getQueuePublishers().fetchPlayerOsuTrack(payload, options);

export const publishProcessTournamentAutomationCheckMessage = (
  payload: { tournamentId: number; overrideVerifiedState: boolean },
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
