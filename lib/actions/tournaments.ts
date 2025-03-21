'use server';

import { tournaments } from '@/lib/api';
import {
  TournamentsGetRequestParams,
  TournamentsListRequestParams,
  TournamentsUpdateRequestParams,
} from '@osu-tournament-rating/otr-api-client';
import { cache } from 'react';

/**
 * The react cache() function determines if a return value can be re-used
 * by the _reference(s)_ of the arguments passed to it.
 *
 * This means that if we define the following function:
 * ```
 * export const get = cache(async (params: TournamentsGetRequestParams) => { });
 * ```
 *
 * And we call the function by composing an object like:
 * ```
 * const id = 10
 * const verified = false;
 * const tournament = await get({ id, verified });
 * const tournament = await get({ id, verified });
 * ```
 *
 * React will never memoize the return value because it is being passed two
 * objects with different references. The solution is to **only use primitives**
 * as parameters for functions like these (see below).
 */

/**
 * Get a tournament
 * @param params see {@link TournamentsGetRequestParams}
 */
export const get = async ({ id, verified }: TournamentsGetRequestParams) =>
  await getCached(id, verified);

const getCached = cache(async (id: number, verified?: boolean) => {
  const { result } = await tournaments.get({ id, verified });
  return result;
});

export async function getTournamentsList(params: TournamentsListRequestParams) {
  const { result } = await tournaments.list(params);
  return result;
}

export async function update(params: TournamentsUpdateRequestParams) {
  const { result } = await tournaments.update(params);
  return result;
}
