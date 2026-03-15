import type { FetchOsuMessage, OsuApiPayload } from '@otr/core';

import type { Logger } from '../../logging/logger';
import type { QueueConsumer } from '@otr/core/queues';
import type { BeatmapFetchService } from '../services/beatmap-fetch-service';
import type { MatchFetchService } from '../services/match-fetch-service';
import type { PlayerFetchService } from '../services/player-fetch-service';
import { BeatmapAttributeService } from '../services/beatmap-attribute-service';

type BeatmapFetchServiceContract = Pick<BeatmapFetchService, 'fetchAndPersist'>;
type BeatmapAttributeServiceContract = Pick<
  BeatmapAttributeService,
  'createAttributes'
>;
type MatchFetchServiceContract = Pick<MatchFetchService, 'fetchAndPersist'>;
type PlayerFetchServiceContract = Pick<PlayerFetchService, 'fetchAndPersist'>;

interface OsuApiFetchWorkerOptions {
  queue: QueueConsumer<FetchOsuMessage>;
  beatmapService: BeatmapFetchServiceContract;
  beatmapAttributeService: BeatmapAttributeServiceContract;
  matchService: MatchFetchServiceContract;
  playerService: PlayerFetchServiceContract;
  logger: Logger;
  config: {
    enableBeatmapAttributeCreation: boolean;
  };
}

export class OsuApiFetchWorker {
  private readonly queue: QueueConsumer<FetchOsuMessage>;
  private readonly beatmapService: BeatmapFetchServiceContract;
  private readonly beatmapAttributeService: BeatmapAttributeServiceContract;
  private readonly matchService: MatchFetchServiceContract;
  private readonly playerService: PlayerFetchServiceContract;
  private readonly logger: Logger;
  private readonly config: OsuApiFetchWorkerOptions['config'];

  constructor(options: OsuApiFetchWorkerOptions) {
    this.queue = options.queue;
    this.beatmapService = options.beatmapService;
    this.beatmapAttributeService = options.beatmapAttributeService;
    this.matchService = options.matchService;
    this.playerService = options.playerService;
    this.logger = options.logger;
    this.config = options.config;
  }

  async start() {
    await this.queue.start(async (message) => {
      const payload = message.payload;
      const msgLogger = this.logger.child({
        correlationId: message.metadata.correlationId,
        messageType: payload.type,
      });

      msgLogger.info('processing osu! API fetch', { type: payload.type });

      try {
        await this.routeMessage(payload, msgLogger);
        await message.ack();
      } catch (error) {
        msgLogger.error('failed to process osu! API fetch', { error });
        await message.nack(true);
      }
    });
  }

  private async routeMessage(
    payload: OsuApiPayload,
    msgLogger: Logger
  ): Promise<void> {
    switch (payload.type) {
      case 'beatmap': {
        const { beatmapId, skipAutomationChecks } = payload;
        msgLogger.info('processing beatmap fetch', {
          beatmapId,
          skipAutomationChecks,
        });
        await this.beatmapService.fetchAndPersist(beatmapId, {
          skipAutomationChecks,
        });
        break;
      }

      case 'beatmap-attributes': {
        if (!this.config.enableBeatmapAttributeCreation) {
          break;
        }

        const { beatmapId } = payload;
        msgLogger.info('processing beatmap attributes.', {
          beatmapId,
        });
        await this.beatmapAttributeService.createAttributes(beatmapId);
        break;
      }

      case 'match': {
        const { osuMatchId, isLazer } = payload;
        msgLogger.info('processing match fetch', { osuMatchId, isLazer });
        const persisted = await this.matchService.fetchAndPersist(
          osuMatchId,
          isLazer
        );
        if (!persisted) {
          msgLogger.warn('match fetch completed without persistence');
        }
        break;
      }

      case 'player': {
        const { osuPlayerId } = payload;
        msgLogger.info('processing player fetch', { osuPlayerId });
        await this.playerService.fetchAndPersist(osuPlayerId);
        break;
      }

      default: {
        const _exhaustive: never = payload;
        throw new Error(`Unknown message type: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }

  async stop() {
    await this.queue.stop();
  }
}
