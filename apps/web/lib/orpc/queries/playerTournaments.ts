import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import type { TournamentListItem } from '@/lib/orpc/schema/tournament';
import { Ruleset } from '@otr/core/osu';

export type PlayerTournamentsRequest = {
  key: string;
  ruleset?: Ruleset;
};

export async function getPlayerTournaments({
  key,
  ruleset,
}: PlayerTournamentsRequest): Promise<TournamentListItem[]> {
  return orpc.players.tournaments({
    key,
    ruleset,
  });
}

export const getPlayerTournamentsCached = cache(
  async (key: string, ruleset?: Ruleset) =>
    getPlayerTournaments({ key, ruleset })
);
