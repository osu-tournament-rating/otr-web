'use server';

import { tournaments } from '@/lib/api';
import { tournamentSubmissionSchema } from '@/lib/schema';
import {
  TournamentsGetRequestParams,
  TournamentsUpdateRequestParams,
} from '@osu-tournament-rating/otr-api-client';
import { cache } from 'react';
import { z } from 'zod';

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

export async function update(params: TournamentsUpdateRequestParams) {
  const { result } = await tournaments.update(params);
  return result;
}

/**
 * Submit a new tournament
 * @param values Tournament submission data
 */
export async function submitTournament(
  values: z.infer<typeof tournamentSubmissionSchema>
) {
  // Destructure to remove unwanted fields
  const { matchLinks, beatmapLinks, ...rest } = values;
  
  // Create processed values with only needed fields
  const processedValues = {
    ...rest,
    ids: matchLinks.map(link =>
      typeof link === 'string' ? extractMatchIdFromUrl(link) : link
    ).filter((matchId): matchId is number => matchId !== null),
    beatmapIds: beatmapLinks.map(link =>
      typeof link === 'string' ? extractBeatmapIdFromUrl(link) : link  
    ).filter((beatmapId): beatmapId is number => beatmapId !== null)
  };

  const { result } = await tournaments.create({
    body: processedValues
  });

  return result;
}

// URL parsing utilities
const extractMatchIdFromUrl = (url: string) => {
  const match = url.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
};

const extractBeatmapIdFromUrl = (url: string) => {
  const beatmapIdMatch = url.match(/\/b\/(\d+)$/);
  if (beatmapIdMatch) return Number(beatmapIdMatch[1]);
  
  const beatmapSetMatch = url.match(/\/beatmapsets\/\d+#\w+\/(\d+)$/);
  return beatmapSetMatch ? Number(beatmapSetMatch[1]) : null;
};
