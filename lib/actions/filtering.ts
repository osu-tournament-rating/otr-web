'use server';

import { filtering } from '@/lib/api/server';
import type {
  FilteringRequestDTO,
  FilteringResultDTO,
} from '@osu-tournament-rating/otr-api-client';
import { parseErrorMessage } from '@/lib/utils/error';

export async function filterPlayers(
  filteringRequest: FilteringRequestDTO
): Promise<{ data?: FilteringResultDTO; error?: string }> {
  try {
    const { result } = await filtering.filter({ body: filteringRequest });
    return { data: result };
  } catch (error) {
    console.error('Error filtering players:', error);
    return { error: parseErrorMessage(error) };
  }
}
