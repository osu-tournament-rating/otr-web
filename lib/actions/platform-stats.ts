'use server';

import { PlatformStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { platformStats } from '../api/server';

export type PlatformStats = PlatformStatsDTO;

export async function getPlatformStats(): Promise<PlatformStats | null> {
  try {
    const { result } = await platformStats.get();
    return result;
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return null;
  }
}
