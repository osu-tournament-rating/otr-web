'use server';

import { GameScoresUpdateRequestParams } from '@osu-tournament-rating/otr-api-client';
import { scores } from '../api/server';

export async function update(params: GameScoresUpdateRequestParams) {
  const { result } = await scores.update(params);
  return result;
}
