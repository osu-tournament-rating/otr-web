import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import type { PlayerDashboardStats } from '@/lib/orpc/schema/playerDashboard';
import { Ruleset } from '@otr/core/osu';

export type PlayerDashboardRequest = {
  playerId: number;
  dateMin?: Date;
  dateMax?: Date;
  ruleset?: Ruleset;
};

const toISOStringOrUndefined = (value?: Date) =>
  value ? value.toISOString() : undefined;

export async function getPlayerDashboardStats({
  playerId,
  dateMin,
  dateMax,
  ruleset,
}: PlayerDashboardRequest): Promise<PlayerDashboardStats> {
  return orpc.players.dashboard({
    playerId,
    dateMin: toISOStringOrUndefined(dateMin),
    dateMax: toISOStringOrUndefined(dateMax),
    ruleset,
  });
}

export const getPlayerDashboardStatsCached = cache(
  async (playerId: number, dateMin?: Date, dateMax?: Date, ruleset?: Ruleset) =>
    getPlayerDashboardStats({ playerId, dateMin, dateMax, ruleset })
);
