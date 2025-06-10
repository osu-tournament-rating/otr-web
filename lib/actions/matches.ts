'use server';

import {
  MatchesGetRequestParams,
  MatchesUpdateRequestParams,
} from '@osu-tournament-rating/otr-api-client';
import { cache } from 'react';
import { matches } from '../api/server';

export const get = async ({ id, verified }: MatchesGetRequestParams) =>
  await getCached(id, verified);

const getCached = cache(async (id: number, verified?: boolean) => {
  const { result } = await matches.get({ id, verified });
  return result;
});

export async function update(params: MatchesUpdateRequestParams) {
  const { result } = await matches.update(params);
  return result;
}

export async function merge(parentId: number, matchIds: number[]) {
  const { result } = await matches.merge({ id: parentId, body: matchIds });
  return result;
}

export async function deleteMatch(id: number) {
  await matches.delete({ id });
}

export async function deletePlayerScores(matchId: number, playerId: number) {
  const { result } = await matches.deletePlayerScores({
    id: matchId,
    playerId,
  });
  return result;
}
