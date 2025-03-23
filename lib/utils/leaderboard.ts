import { z } from 'zod';
import { leaderboardFilterSchema } from '../schema';
import { setFlattenedParams } from './urlParams';

export const leaderboardTierFilterValues = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'master',
  'grandmaster',
  'eliteGrandmaster',
] as const;

export function createUrlParamsFromSchema(
  schema: z.infer<typeof leaderboardFilterSchema>
) {
  const searchParams = new URLSearchParams();

  Object.entries(schema).forEach(([k, v]) => {
    if (
      v === undefined ||
      leaderboardTierFilterValues[k as keyof typeof leaderboardTierFilterValues]
    )
      return;

    setFlattenedParams<string | number>(searchParams, k, v);
  });

  return searchParams;
}
