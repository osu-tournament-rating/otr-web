'use server';

import {
  GamesGetRequestParams,
  GamesUpdateRequestParams,
} from '@osu-tournament-rating/otr-api-client';
import { cache } from 'react';
import { games } from '../api/server';

export const get = async ({ id, verified }: GamesGetRequestParams) =>
  await getCached(id, verified);

const getCached = cache(async (id: number, verified?: boolean) => {
  const { result } = await games.get({ id, verified });
  return result;
});

export async function update(params: GamesUpdateRequestParams) {
  const { result } = await games.update(params);
  return result;
}

export async function deleteGame(id: number) {
  await games.delete({ id });
}

export async function mergeGames(
  targetGameId: number,
  sourceGameIds: number[]
) {
  const { result } = await games.mergeScores({
    id: targetGameId,
    body: sourceGameIds,
  });
  return result;
}
