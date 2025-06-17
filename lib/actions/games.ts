'use server';

import {
  GamesGetRequestParams,
  GamesUpdateRequestParams,
} from '@osu-tournament-rating/otr-api-client';
import { cache } from 'react';
import { games } from '../api/server';

export const get = async ({ id }: GamesGetRequestParams) =>
  await getCached(id);

const getCached = cache(async (id: number) => {
  const { result } = await games.get({ id });
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
