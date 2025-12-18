import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import { Ruleset } from '@otr/core/osu';
import {
  PlayerBeatmapsRequest,
  PlayerBeatmapsResponse,
} from '../schema/playerBeatmaps';

export async function getPlayerBeatmaps({
  id,
  keyType = 'otr',
  ruleset,
  limit,
  offset,
}: PlayerBeatmapsRequest): Promise<PlayerBeatmapsResponse> {
  return orpc.players.beatmaps({
    id,
    keyType,
    ruleset,
    limit,
    offset,
  });
}

export const getPlayerBeatmapsCached = cache(
  async (
    playerId: number,
    ruleset?: Ruleset,
    limit?: number,
    offset?: number
  ) =>
    getPlayerBeatmaps({
      id: playerId,
      keyType: 'otr',
      ruleset,
      limit,
      offset,
    })
);
