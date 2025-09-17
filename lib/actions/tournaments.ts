'use server';

import { tournaments } from '@/lib/api/server';
import { isValidationProblemDetails } from '../api/shared';
import {
  TournamentsCreateRequestParams,
  TournamentSubmissionDTO,
  TournamentsUpdateRequestParams,
  TournamentsRerunAutomationChecksRequestParams,
  TournamentsAcceptPreVerificationStatusesRequestParams,
} from '@osu-tournament-rating/otr-api-client';

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
