'use server';

import { LeaderboardsGetRequestParams } from '@osu-tournament-rating/otr-api-client';
import { leaderboards } from '../api/server';

export async function get(params: LeaderboardsGetRequestParams) {
  const { result } = await leaderboards.get(params);
  return result;
}
