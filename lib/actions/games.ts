'use server';

import { GamesUpdateRequestParams } from '@osu-tournament-rating/otr-api-client';
import { games } from '../api/server';

export async function update(params: GamesUpdateRequestParams) {
  const { result } = await games.update(params);
  return result;
}

export async function deleteGame(id: number) {
  await games.delete({ id });
}
