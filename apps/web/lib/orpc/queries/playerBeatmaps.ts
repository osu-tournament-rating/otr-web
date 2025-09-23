import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import { Ruleset } from '@otr/core/osu';
import { PlayerBeatmapStats } from '../schema/playerBeatmaps';

export type PlayerBeatmapsRequest = {
  key: string;
  ruleset?: Ruleset;
};

export async function getPlayerBeatmaps({
  key,
  ruleset,
}: PlayerBeatmapsRequest): Promise<PlayerBeatmapStats[]> {
  return orpc.players.beatmaps({
    key,
    ruleset,
  });
}

export const getPlayerBeatmapsCached = cache(
  async (key: string, ruleset?: Ruleset) => getPlayerBeatmaps({ key, ruleset })
);
