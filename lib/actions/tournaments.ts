'use server';

import {
  TournamentsUpdateRequestParams,
  TournamentsGetRequestParams,
} from '@osu-tournament-rating/otr-api-client';
import { tournaments } from '@/lib/api';
import { cache } from 'react';

export const get = cache(async (params: TournamentsGetRequestParams) => {
  const { result } = await tournaments.get(params);
  return result;
});

export async function update(params: TournamentsUpdateRequestParams) {
  const { result } = await tournaments.update(params);
  return result;
}
