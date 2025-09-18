'use server';

import { tournaments } from '@/lib/api/server';
import { isValidationProblemDetails } from '../api/shared';
import {
  TournamentsCreateRequestParams,
  TournamentSubmissionDTO,
} from '@osu-tournament-rating/otr-api-client';

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

export async function insertBeatmaps(id: number, beatmapIds: number[]) {
  await tournaments.insertBeatmaps({ id, body: beatmapIds });
}

export async function deleteSpecificBeatmaps(id: number, beatmapIds: number[]) {
  await tournaments.deleteBeatmaps({ id, body: beatmapIds });
}
