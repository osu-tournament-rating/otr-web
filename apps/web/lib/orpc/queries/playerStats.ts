import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import type { PlayerStats as PlayerStatsResponse } from '@/lib/orpc/schema/playerStats';
import { Ruleset } from '@otr/core/osu';

export type PlayerStatsRequest = {
  playerId: number;
  dateMin?: Date;
  dateMax?: Date;
  ruleset?: Ruleset;
};

const toISOStringOrUndefined = (value?: Date) =>
  value ? value.toISOString() : undefined;

export async function getPlayerStats({
  playerId,
  dateMin,
  dateMax,
  ruleset,
}: PlayerStatsRequest): Promise<PlayerStatsResponse> {
  return orpc.players.stats({
    playerId,
    dateMin: toISOStringOrUndefined(dateMin),
    dateMax: toISOStringOrUndefined(dateMax),
    ruleset,
  });
}

export const getPlayerStatsCached = cache(
  async (playerId: number, dateMin?: Date, dateMax?: Date, ruleset?: Ruleset) =>
    getPlayerStats({ playerId, dateMin, dateMax, ruleset })
);
