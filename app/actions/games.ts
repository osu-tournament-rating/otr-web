'use server';

import {
  GamesGetRequestParams,
  GamesWrapper,
} from '@osu-tournament-rating/otr-api-client';
import { apiWrapperConfiguration } from '@/lib/api';

/**
 * Get a single game
 * @param params see {@link GamesGetRequestParams}
 */
export async function getGame(params: GamesGetRequestParams) {
  const wrapper = new GamesWrapper(apiWrapperConfiguration);
  const { result } = await wrapper.get(params);

  return result;
}
