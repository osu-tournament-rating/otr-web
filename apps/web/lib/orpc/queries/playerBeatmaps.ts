import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import { Ruleset } from '@otr/core/osu';
import {
  PlayerBeatmapsRequest,
  PlayerBeatmapsResponse,
} from '../schema/playerBeatmaps';

export async function getPlayerBeatmaps({
  playerId,
  ruleset,
  limit,
  offset,
}: PlayerBeatmapsRequest): Promise<PlayerBeatmapsResponse> {
  return orpc.players.beatmaps({
    playerId,
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
      playerId,
      ruleset,
      limit,
      offset,
    })
);
