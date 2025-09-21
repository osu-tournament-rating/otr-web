import { QueueConstants, type FetchPlayerOsuTrackMessage } from '@otr/core';

import { dataWorkerEnv } from './env';
import { consoleLogger } from './logging/logger';
import { RabbitMqConsumer } from './queue/rabbitmq-consumer';
import { FixedIntervalRateLimiter } from './osu-track/rate-limiter';
import { OsuTrackClient } from './osu-track/client';
import { OsuTrackPlayerWorker } from './osu-track/worker';

const logger = consoleLogger;

const bootstrap = async () => {
  const osuTrackClient = new OsuTrackClient({
    baseUrl: dataWorkerEnv.osuTrackApiBaseUrl,
  });

  const queueConsumer = new RabbitMqConsumer<FetchPlayerOsuTrackMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.osuTrack.players,
    prefetch: 1,
    logger,
  });

  const rateLimiter = new FixedIntervalRateLimiter(
    dataWorkerEnv.osuTrackRequestsPerMinute
  );

  const worker = new OsuTrackPlayerWorker({
    queue: queueConsumer,
    client: osuTrackClient,
    rateLimiter,
    logger,
  });

  logger.info('Starting osu!track player worker');

  await worker.start();

  const shutdown = async () => {
    logger.info('Shutting down osu!track player worker');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap data worker', { error });
  process.exit(1);
});
