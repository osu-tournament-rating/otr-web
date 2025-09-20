import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import type { PlayerDashboardStats } from '@/lib/orpc/schema/playerDashboard';

export type PlayerDashboardRequest = {
  key: string;
  dateMin?: Date;
  dateMax?: Date;
  ruleset?: number;
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
    ruleset,
    dateMin: toISOStringOrUndefined(dateMin),
    dateMax: toISOStringOrUndefined(dateMax),
  });
}

export const getPlayerDashboardStatsCached = cache(
  async (key: string, dateMin?: Date, dateMax?: Date, ruleset?: number) =>
    getPlayerDashboardStats({ key, dateMin, dateMax, ruleset })
);
