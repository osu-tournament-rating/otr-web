import { z } from 'zod';
import { leaderboardFilterSchema } from '../schema';
import { setFlattenedParams } from './urlParams';
import { Ruleset } from '@/lib/osu/enums';

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

export const defaultLeaderboardFilterValues: z.infer<
  typeof leaderboardFilterSchema
> = {
  page: 1,
  ruleset: Ruleset.Osu,
  country: '',
  minOsuRank: 1,
  maxOsuRank: 1000000,
  minRating: 100,
  maxRating: 3500,
  minMatches: 1,
  maxMatches: 1000,
  minWinRate: 0,
  maxWinRate: 100,
  tiers: [],
};

export function createSearchParamsFromSchema(
  schema: z.infer<typeof leaderboardFilterSchema>
): URLSearchParams {
  const searchParams = new URLSearchParams();
  Object.entries(schema).forEach(([k, v]) => {
    if (k in defaultLeaderboardFilterValues) {
      const key = k as keyof typeof defaultLeaderboardFilterValues;
      const defaultValue = defaultLeaderboardFilterValues[key];

      if (v === undefined || v === defaultValue || v === '') {
        return;
      }

      setFlattenedParams<string | number>(searchParams, k, v);
    }
  });

  return searchParams;
}
