import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import type { PlayerViewerMatchups } from '@/lib/orpc/schema/playerStats';
import { Ruleset } from '@otr/core/osu';

export type PlayerViewerMatchupsRequest = {
  id: number;
  dateMin?: Date;
  dateMax?: Date;
  ruleset?: Ruleset;
};

const toISOStringOrUndefined = (value?: Date) =>
  value ? value.toISOString() : undefined;

export async function getPlayerViewerMatchups({
  id,
  dateMin,
  dateMax,
  ruleset,
}: PlayerViewerMatchupsRequest): Promise<PlayerViewerMatchups> {
  return orpc.players.viewerMatchups({
    id,
    keyType: 'otr',
    dateMin: toISOStringOrUndefined(dateMin),
    dateMax: toISOStringOrUndefined(dateMax),
    ruleset,
  });
}

export const getPlayerViewerMatchupsCached = cache(
  async (playerId: number, dateMin?: Date, dateMax?: Date, ruleset?: Ruleset) =>
    getPlayerViewerMatchups({ id: playerId, dateMin, dateMax, ruleset })
);
