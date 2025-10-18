import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import type { PlayerStats as PlayerStatsResponse } from '@/lib/orpc/schema/playerStats';
import { Ruleset } from '@otr/core/osu';

export type PlayerStatsRequest = {
  id: number;
  dateMin?: Date;
  dateMax?: Date;
  ruleset?: Ruleset;
};

const toISOStringOrUndefined = (value?: Date) =>
  value ? value.toISOString() : undefined;

export async function getPlayerStats({
  id,
  dateMin,
  dateMax,
  ruleset,
}: PlayerStatsRequest): Promise<PlayerStatsResponse> {
  return orpc.players.stats({
    id,
    dateMin: toISOStringOrUndefined(dateMin),
    dateMax: toISOStringOrUndefined(dateMax),
    ruleset,
  });
}

export const getPlayerStatsCached = cache(
  async (playerId: number, dateMin?: Date, dateMax?: Date, ruleset?: Ruleset) =>
    getPlayerStats({ id: playerId, dateMin, dateMax, ruleset })
);
