import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import type { PlayerDashboardStats } from '@/lib/orpc/schema/playerDashboard';
import { Ruleset } from '@otr/core/osu';

export type PlayerDashboardRequest = {
  key: string;
  dateMin?: Date;
  dateMax?: Date;
  ruleset?: Ruleset;
};

const toISOStringOrUndefined = (value?: Date) =>
  value ? value.toISOString() : undefined;

export async function getPlayerDashboardStats({
  key,
  dateMin,
  dateMax,
  ruleset,
}: PlayerDashboardRequest): Promise<PlayerDashboardStats> {
  return orpc.players.dashboard({
    key,
    dateMin: toISOStringOrUndefined(dateMin),
    dateMax: toISOStringOrUndefined(dateMax),
    ruleset,
  });
}

export const getPlayerDashboardStatsCached = cache(
  async (key: string, dateMin?: Date, dateMax?: Date, ruleset?: Ruleset) =>
    getPlayerDashboardStats({ key, dateMin, dateMax, ruleset })
);
