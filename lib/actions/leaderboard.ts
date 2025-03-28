'use server';

import { LeaderboardsGetRequestParams } from '@osu-tournament-rating/otr-api-client';
import { leaderboards } from '../api';

export async function get(params: LeaderboardsGetRequestParams) {
  const { result } = await leaderboards.get(params);
  return result;
}
