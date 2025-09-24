import {
  QueueConstants,
  type FetchBeatmapMessage,
  type FetchMatchMessage,
  type FetchPlayerMessage,
  type FetchPlayerOsuTrackMessage,
} from '@otr/core';

import { db } from './db';
import { dataWorkerEnv } from './env';
import { consoleLogger } from './logging/logger';
import { RabbitMqConsumer } from './queue/rabbitmq-consumer';
import { RabbitMqPublisher } from './queue/rabbitmq-publisher';
import { FixedWindowRateLimiter } from './rate-limiter';
import {
  BeatmapFetchService,
  BeatmapFetchWorker,
  MatchFetchService,
  MatchFetchWorker,
  PlayerFetchService,
  PlayerFetchWorker,
  TournamentDataCompletionService,
  createOsuApiClient,
} from './osu';
import { OsuTrackClient } from './osu-track/client';
import { OsuTrackPlayerWorker } from './osu-track/worker';
import { processOsuTrackPlayerResults } from './osu-track/persistence';

const logger = consoleLogger;

const bootstrap = async () => {
  const osuApiClient = await createOsuApiClient();

  const osuApiRateLimiter = new FixedWindowRateLimiter({
    requests: dataWorkerEnv.osuApiRateLimit.requests,
    windowMs: dataWorkerEnv.osuApiRateLimit.windowSeconds * 1000,
  });

  const osuTrackRateLimiter = new FixedWindowRateLimiter({
    requests: dataWorkerEnv.osuTrackRateLimit.requests,
    windowMs: dataWorkerEnv.osuTrackRateLimit.windowSeconds * 1000,
  });

  const dataCompletion = new TournamentDataCompletionService({
    db,
    logger,
  });

  const beatmapPublisher = new RabbitMqPublisher<FetchBeatmapMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.osu.beatmaps,
  });

  const beatmapConsumer = new RabbitMqConsumer<FetchBeatmapMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.osu.beatmaps,
    prefetch: 1,
    logger,
  });

  const matchConsumer = new RabbitMqConsumer<FetchMatchMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.osu.matches,
    prefetch: 1,
    logger,
  });

  const playerConsumer = new RabbitMqConsumer<FetchPlayerMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.osu.players,
    prefetch: 1,
    logger,
  });

  const osuTrackConsumer = new RabbitMqConsumer<FetchPlayerOsuTrackMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.osuTrack.players,
    prefetch: 1,
    logger,
  });

  const beatmapService = new BeatmapFetchService({
    db,
    api: osuApiClient,
    rateLimiter: osuApiRateLimiter,
    logger,
    dataCompletion,
  });

  const matchService = new MatchFetchService({
    db,
    api: osuApiClient,
    rateLimiter: osuApiRateLimiter,
    logger,
    dataCompletion,
    publishBeatmapFetch: async (osuBeatmapId) => {
      await beatmapPublisher.publish({ beatmapId: osuBeatmapId });
    },
  });

  const playerService = new PlayerFetchService({
    db,
    api: osuApiClient,
    rateLimiter: osuApiRateLimiter,
    logger,
  });

  const beatmapWorker = new BeatmapFetchWorker({
    queue: beatmapConsumer,
    service: beatmapService,
    logger,
  });

  const matchWorker = new MatchFetchWorker({
    queue: matchConsumer,
    service: matchService,
    logger,
  });

  const playerWorker = new PlayerFetchWorker({
    queue: playerConsumer,
    service: playerService,
    logger,
  });

  const osuTrackClient = new OsuTrackClient({});

  const osuTrackWorker = new OsuTrackPlayerWorker({
    queue: osuTrackConsumer,
    client: osuTrackClient,
    rateLimiter: osuTrackRateLimiter,
    logger,
    onPlayer: async ({ message, results }) => {
      await processOsuTrackPlayerResults({
        db,
        logger,
        osuPlayerId: message.osuPlayerId,
        results,
      });
    },
  });

  logger.info('Starting data worker services');

  await Promise.all([
    beatmapWorker.start(),
    matchWorker.start(),
    playerWorker.start(),
    osuTrackWorker.start(),
  ]);

  const shutdown = async () => {
    logger.info('Shutting down data worker services');
    await Promise.allSettled([
      beatmapWorker.stop(),
      matchWorker.stop(),
      playerWorker.stop(),
      osuTrackWorker.stop(),
      beatmapPublisher.close(),
    ]);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap data worker', { error });
  process.exit(1);
});
