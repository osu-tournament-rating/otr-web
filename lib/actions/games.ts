'use server';

import { GamesUpdateRequestParams } from '@osu-tournament-rating/otr-api-client';
import { games } from '../api';

export async function update(params: GamesUpdateRequestParams) {
  const { result } = await games.update(params);
  return result;
}
