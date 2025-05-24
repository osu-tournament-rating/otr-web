'use server';

import { SearchSearchRequestParams } from '@osu-tournament-rating/otr-api-client';
import { search } from '../api/server';

export async function getSearch(params: SearchSearchRequestParams) {
  const { result } = await search.search(params);
  return result;
}
