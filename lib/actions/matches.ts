import { MatchesGetRequestParams } from '@osu-tournament-rating/otr-api-client';
import { cache } from 'react';
import { matches } from '../api';

export const get = async ({ id, verified }: MatchesGetRequestParams) =>
  await getCached(id, verified);

const getCached = cache(async (id: number, verified?: boolean) => {
  const { result } = await matches.get({ id, verified });
  return result;
});
