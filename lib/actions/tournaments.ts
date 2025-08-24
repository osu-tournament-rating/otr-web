'use server';

import { tournaments } from '@/lib/api/server';
import { isValidationProblemDetails } from '../api/shared';
import {
  TournamentsCreateRequestParams,
  TournamentsGetRequestParams,
  TournamentSubmissionDTO,
  TournamentsUpdateRequestParams,
  TournamentsListRequestParams,
  TournamentsRerunAutomationChecksRequestParams,
  TournamentsAcceptPreVerificationStatusesRequestParams,
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
export const get = async ({ id }: TournamentsGetRequestParams) =>
  await getCached(id);

const getCached = cache(async (id: number) => {
  const { result } = await tournaments.get({ id });
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

export async function submit(params: TournamentsCreateRequestParams) {
  try {
    const { result } = await tournaments.create(params);
    return result;
  } catch (error) {
    if (isValidationProblemDetails<TournamentSubmissionDTO>(error)) {
      return error;
    }

    throw error;
  }
}

export async function rerunAutomatedChecks(
  params: TournamentsRerunAutomationChecksRequestParams
) {
  const { result } = await tournaments.rerunAutomationChecks(params);
  return result;
}

export async function deleteTournament(id: number) {
  await tournaments.delete({ id });
}

export async function acceptPreVerificationStatuses(
  params: TournamentsAcceptPreVerificationStatusesRequestParams
) {
  const { result } = await tournaments.acceptPreVerificationStatuses(params);
  return result;
}

export async function getBeatmaps(id: number) {
  const { result } = await tournaments.getBeatmaps({ id });
  return result;
}

export async function deleteBeatmaps(id: number) {
  await tournaments.deleteBeatmaps({ id });
}

export async function insertBeatmaps(id: number, beatmapIds: number[]) {
  await tournaments.insertBeatmaps({ id, body: beatmapIds });
}

export async function deleteSpecificBeatmaps(id: number, beatmapIds: number[]) {
  await tournaments.deleteBeatmaps({ id, body: beatmapIds });
}

export async function refetchMatchData(id: number) {
  const { result } = await tournaments.fetchMatchData({ id });
  return result;
}
