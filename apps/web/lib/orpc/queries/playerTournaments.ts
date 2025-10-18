import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import type { TournamentListItem } from '@/lib/orpc/schema/tournament';
import { Ruleset } from '@otr/core/osu';

export type PlayerTournamentsRequest = {
  id: number;
  dateMin?: Date;
  dateMax?: Date;
  ruleset?: Ruleset;
};

const toISOStringOrUndefined = (value?: Date) =>
  value ? value.toISOString() : undefined;

export async function getPlayerTournaments({
  id,
  dateMin,
  dateMax,
  ruleset,
}: PlayerTournamentsRequest): Promise<TournamentListItem[]> {
  return orpc.players.tournaments({
    id,
    dateMin: toISOStringOrUndefined(dateMin),
    dateMax: toISOStringOrUndefined(dateMax),
    ruleset,
  });
}

export const getPlayerTournamentsCached = cache(
  async (playerId: number, dateMin?: Date, dateMax?: Date, ruleset?: Ruleset) =>
    getPlayerTournaments({ id: playerId, dateMin, dateMax, ruleset })
);
