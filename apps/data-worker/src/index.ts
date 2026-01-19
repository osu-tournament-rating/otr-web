import {
  QueueConstants,
  type FetchOsuMessage,
  type FetchPlayerOsuTrackMessage,
  type ProcessTournamentAutomationCheckMessage,
  type ProcessTournamentStatsMessage,
} from '@otr/core';

import { db } from './db';
import { startMetricsServer } from './metrics';
import { dataWorkerEnv } from './env';
import { consoleLogger } from './logging/logger';
import { RabbitMqConsumer } from './queue/rabbitmq-consumer';
import { RabbitMqPublisher } from './queue/rabbitmq-publisher';
import { FixedWindowRateLimiter } from './rate-limiter';
import {
  BeatmapFetchService,
  MatchFetchService,
  OsuApiFetchWorker,
  PlayerFetchService,
  TournamentDataCompletionService,
  createOsuApiClient,
} from './osu';
import { OsuTrackClient } from './osu-track/client';
import { OsuTrackPlayerWorker } from './osu-track/worker';
import { processOsuTrackPlayerResults } from './osu-track/persistence';
import {
  GameAutomationChecks,
  MatchAutomationChecks,
  ScoreAutomationChecks,
  TournamentAutomationCheckService,
  TournamentAutomationCheckWorker,
  TournamentAutomationChecks,
} from './automation-checks';
import {
  TournamentStatsCalculator,
  TournamentStatsService,
  TournamentStatsWorker,
} from './stats';
import { PlayerRefetchScheduler } from './players/player-refetch-scheduler';

const logger = consoleLogger;

startMetricsServer();

const bootstrap = async () => {
  const osuApiClient = await createOsuApiClient();

  const osuApiRateLimiter = new FixedWindowRateLimiter({
    requests: dataWorkerEnv.osuApiRateLimit.requests,
    windowMs: dataWorkerEnv.osuApiRateLimit.windowSeconds * 1000,
    logger,
    label: 'osu-api',
  });

  const osuTrackRateLimiter = new FixedWindowRateLimiter({
    requests: dataWorkerEnv.osuTrackRateLimit.requests,
    windowMs: dataWorkerEnv.osuTrackRateLimit.windowSeconds * 1000,
    logger,
    label: 'osu-track',
  });

  const automationPublisher =
    new RabbitMqPublisher<ProcessTournamentAutomationCheckMessage>({
      url: dataWorkerEnv.amqpUrl,
      queue: QueueConstants.automatedChecks.tournaments,
    });

  const dataCompletion = new TournamentDataCompletionService({
    db,
    logger,
    publishAutomationCheck: async ({ tournamentId, overrideVerifiedState }) => {
      await automationPublisher.publish({
        tournamentId,
        overrideVerifiedState,
      });
    },
  });

  const osuPublisher = new RabbitMqPublisher<FetchOsuMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.osu,
  });

  const osuTrackPublisher = new RabbitMqPublisher<FetchPlayerOsuTrackMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.osuTrack,
  });

  const osuConsumer = new RabbitMqConsumer<FetchOsuMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.osu,
    prefetch: 1,
    logger,
  });

  const osuTrackConsumer = new RabbitMqConsumer<FetchPlayerOsuTrackMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.osuTrack,
    prefetch: 1,
    logger,
  });

  const automationConsumer =
    new RabbitMqConsumer<ProcessTournamentAutomationCheckMessage>({
      url: dataWorkerEnv.amqpUrl,
      queue: QueueConstants.automatedChecks.tournaments,
      prefetch: 1,
      logger,
    });

  const statsConsumer = new RabbitMqConsumer<ProcessTournamentStatsMessage>({
    url: dataWorkerEnv.amqpUrl,
    queue: QueueConstants.stats.tournaments,
    prefetch: 1,
    logger,
  });

  const beatmapService = new BeatmapFetchService({
    db,
    api: osuApiClient,
    rateLimiter: osuApiRateLimiter,
    logger,
    dataCompletion,
    publishPlayerFetch: async (osuPlayerId) => {
      await osuPublisher.publish({ type: 'player', osuPlayerId });
    },
  });

  const matchService = new MatchFetchService({
    db,
    api: osuApiClient,
    rateLimiter: osuApiRateLimiter,
    logger,
    dataCompletion,
    publishBeatmapFetch: async (osuBeatmapId) => {
      await osuPublisher.publish({ type: 'beatmap', beatmapId: osuBeatmapId });
    },
  });

  const playerService = new PlayerFetchService({
    db,
    api: osuApiClient,
    rateLimiter: osuApiRateLimiter,
    logger,
  });

  const playerRefetchScheduler = new PlayerRefetchScheduler({
    db,
    logger,
    osuPublisher,
    osuTrackPublisher,
    config: dataWorkerEnv.playerAutoRefetch,
  });

  const automationService = new TournamentAutomationCheckService({
    db,
    logger,
    tournamentChecks: new TournamentAutomationChecks(),
    matchChecks: new MatchAutomationChecks(),
    gameChecks: new GameAutomationChecks(),
    scoreChecks: new ScoreAutomationChecks(),
  });

  const statsCalculator = new TournamentStatsCalculator();
  const statsService = new TournamentStatsService({
    db,
    logger,
    calculator: statsCalculator,
  });

  const osuWorker = new OsuApiFetchWorker({
    queue: osuConsumer,
    beatmapService,
    matchService,
    playerService,
    logger,
  });

  const osuTrackClient = new OsuTrackClient({});

  const osuTrackWorker = new OsuTrackPlayerWorker({
    queue: osuTrackConsumer,
    client: osuTrackClient,
    rateLimiter: osuTrackRateLimiter,
    db,
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

  const automationWorker = new TournamentAutomationCheckWorker({
    queue: automationConsumer,
    service: automationService,
    dataCompletion,
    logger,
  });

  const statsWorker = new TournamentStatsWorker({
    queue: statsConsumer,
    service: statsService,
    logger,
  });

  logger.info('Starting data worker services');

  await Promise.all([
    osuWorker.start(),
    osuTrackWorker.start(),
    automationWorker.start(),
    statsWorker.start(),
  ]);

  await playerRefetchScheduler.start();

  const shutdown = async () => {
    logger.info('Shutting down data worker services');
    await Promise.allSettled([
      osuWorker.stop(),
      osuTrackWorker.stop(),
      automationWorker.stop(),
      statsWorker.stop(),
      playerRefetchScheduler.stop(),
      osuPublisher.close(),
      automationPublisher.close(),
      osuTrackPublisher.close(),
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
