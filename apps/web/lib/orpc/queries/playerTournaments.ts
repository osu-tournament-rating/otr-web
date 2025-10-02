import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import type { TournamentListItem } from '@/lib/orpc/schema/tournament';
import { Ruleset } from '@otr/core/osu';

export type PlayerTournamentsRequest = {
  key: string;
  dateMin?: Date;
  dateMax?: Date;
  ruleset?: Ruleset;
};

const toISOStringOrUndefined = (value?: Date) =>
  value ? value.toISOString() : undefined;

export async function getPlayerTournaments({
  key,
  dateMin,
  dateMax,
  ruleset,
}: PlayerTournamentsRequest): Promise<TournamentListItem[]> {
  return orpc.players.tournaments({
    key,
    dateMin: toISOStringOrUndefined(dateMin),
    dateMax: toISOStringOrUndefined(dateMax),
    ruleset,
  });
}

export const getPlayerTournamentsCached = cache(
  async (key: string, dateMin?: Date, dateMax?: Date, ruleset?: Ruleset) =>
    getPlayerTournaments({ key, dateMin, dateMax, ruleset })
);
