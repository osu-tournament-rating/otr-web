import { eq } from 'drizzle-orm';
import type { API } from 'osu-api-v2-js';

import { withNotFoundHandling } from '../api-helpers';
import { convertRuleset } from '../conversions';
import type { DatabaseClient } from '../../db';
import type { Logger } from '../../logging/logger';
import type { RateLimiter } from '../../rate-limiter';
import * as schema from '@otr/core/db/schema';
import { Ruleset } from '@otr/core/osu/enums';

const FETCHABLE_RULESETS = [
  Ruleset.Osu,
  Ruleset.Taiko,
  Ruleset.Catch,
  Ruleset.ManiaOther,
] as const;

const MANIA_VARIANT_MAP: Record<string, Ruleset> = {
  '4k': Ruleset.Mania4k,
  '7k': Ruleset.Mania7k,
};

type RulesetConfig = (typeof FETCHABLE_RULESETS)[number];

interface PlayerFetchServiceOptions {
  db: DatabaseClient;
  api: API;
  rateLimiter: RateLimiter;
  logger: Logger;
}

export class PlayerFetchService {
  private readonly db: DatabaseClient;
  private readonly api: API;
  private readonly rateLimiter: RateLimiter;
  private readonly logger: Logger;

  constructor(options: PlayerFetchServiceOptions) {
    this.db = options.db;
    this.api = options.api;
    this.rateLimiter = options.rateLimiter;
    this.logger = options.logger;
  }

  async fetchAndPersist(osuPlayerId: number): Promise<boolean> {
    const player = await this.getOrCreatePlayer(osuPlayerId);
    const nowIso = new Date().toISOString();

    let processed = false;

    for (const ruleset of FETCHABLE_RULESETS) {
      const apiRuleset = ruleset as number;
      const apiUser = await this.rateLimiter.schedule(() =>
        withNotFoundHandling(() => this.api.getUser(osuPlayerId, apiRuleset))
      );

      if (!apiUser) {
        this.logger.warn('osu! API returned no data for player', {
          osuPlayerId,
          ruleset,
        });
        return false;
      }

      if (!processed) {
        await this.updatePlayerCore(player.id, apiUser, nowIso);
        processed = true;
      }

      if (!apiUser.statistics) {
        continue;
      }

      await this.updateRulesetData(player.id, ruleset, apiUser, nowIso);
    }

    if (!processed) {
      this.logger.warn('osu! API returned no statistics for player', {
        osuPlayerId,
      });
      return false;
    }

    return true;
  }

  private async getOrCreatePlayer(
    osuPlayerId: number
  ): Promise<{ id: number }> {
    const existing = await this.db.query.players.findFirst({
      where: eq(schema.players.osuId, osuPlayerId),
      columns: {
        id: true,
      },
    });

    if (existing) {
      return existing;
    }

    const [inserted] = await this.db
      .insert(schema.players)
      .values({
        osuId: osuPlayerId,
      })
      .returning({ id: schema.players.id });

    if (!inserted) {
      throw new Error('Failed to create player record');
    }

    return inserted;
  }

  private async updatePlayerCore(
    playerId: number,
    apiUser: Awaited<ReturnType<API['getUser']>>,
    nowIso: string
  ) {
    const defaultRuleset = convertRuleset(apiUser.playmode ?? null);
    const updatedCountry = apiUser.country?.code ?? apiUser.country_code ?? '';

    await this.db
      .update(schema.players)
      .set({
        username: apiUser.username ?? '',
        country: updatedCountry,
        defaultRuleset,
        osuLastFetch: nowIso,
        updated: nowIso,
      })
      .where(eq(schema.players.id, playerId));
  }

  private async updateRulesetData(
    playerId: number,
    ruleset: RulesetConfig,
    apiUser: Awaited<ReturnType<API['getUser']>>,
    nowIso: string
  ) {
    const stats = apiUser.statistics;

    if (ruleset === Ruleset.ManiaOther) {
      await this.upsertRulesetData({
        playerId,
        ruleset,
        pp: stats?.pp ?? 0,
        globalRank: stats?.global_rank ?? null,
        updated: nowIso,
      });

      const variants = (
        stats as unknown as {
          variants?: Array<Record<string, unknown>>;
        }
      )?.variants;

      if (Array.isArray(variants)) {
        for (const variant of variants) {
          const hasRanking =
            (variant as { is_ranked?: boolean }).is_ranked ||
            (variant as { global_rank?: unknown }).global_rank !== undefined;

          if (!hasRanking) {
            continue;
          }

          const mappedRuleset =
            MANIA_VARIANT_MAP[
              String(
                (variant as { variant?: string }).variant ?? ''
              ).toLowerCase()
            ];

          if (!mappedRuleset) {
            continue;
          }

          await this.upsertRulesetData({
            playerId,
            ruleset: mappedRuleset,
            pp: Number((variant as { pp?: number }).pp ?? 0),
            globalRank:
              (variant as { global_rank?: number | null }).global_rank ?? null,
            updated: nowIso,
          });
        }
      }

      return;
    }

    await this.upsertRulesetData({
      playerId,
      ruleset,
      pp: stats?.pp ?? 0,
      globalRank: stats?.global_rank ?? null,
      updated: nowIso,
    });
  }

  private async upsertRulesetData(options: {
    playerId: number;
    ruleset: Ruleset;
    pp: number;
    globalRank: number | null;
    updated: string;
  }) {
    await this.db
      .insert(schema.playerOsuRulesetData)
      .values({
        playerId: options.playerId,
        ruleset: options.ruleset,
        pp: options.pp,
        globalRank: options.globalRank,
        updated: options.updated,
      })
      .onConflictDoUpdate({
        target: [
          schema.playerOsuRulesetData.playerId,
          schema.playerOsuRulesetData.ruleset,
        ],
        set: {
          pp: options.pp,
          globalRank: options.globalRank,
          updated: options.updated,
        },
      });
  }
}
