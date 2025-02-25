'use server';

import { apiWrapperConfiguration } from '@/lib/api';
import {
  SearchSearchRequestParams,
  SearchWrapper,
} from '@osu-tournament-rating/otr-api-client';

export async function search(params: SearchSearchRequestParams) {
  const wrapper = new SearchWrapper(apiWrapperConfiguration);

  const { result } = await wrapper.search(params);
  return result;
}
