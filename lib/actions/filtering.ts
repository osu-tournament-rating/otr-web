'use server';

import { FilteringRequestDTO } from '@osu-tournament-rating/otr-api-client';
import { filtering } from '../api/server';

export async function filterPlayers(body: FilteringRequestDTO) {
  const { result } = await filtering.filter({ body });
  return { data: result };
}

export async function getFilterReport(id: number) {
  const { result } = await filtering.getFilterReport({ id });
  return { data: result };
}
