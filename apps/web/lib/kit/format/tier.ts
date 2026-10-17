/**
 * Tier names as the site writes them: the tier, then its subtier as a roman
 * numeral, "Gold II". Elite Grandmaster has no subtiers.
 */

import type { TierName } from '@/lib/utils/tierData';

export type { TierName };

const SUBTIER_NUMERALS: Readonly<Record<number, string>> = {
  1: 'I',
  2: 'II',
  3: 'III',
};

/**
 * `Gold II`, `Bronze III`, `Elite Grandmaster`. Without a subtier (or with
 * one outside 1–3) it is the tier alone, `Gold`, as on a chart's tier
 * legend. Subtier 1 is the top of a tier and 3 the bottom.
 */
export function formatTierName(
  tier: TierName,
  subTier?: number | null
): string {
  if (tier === 'Elite Grandmaster') return tier;

  const numeral =
    subTier === null || subTier === undefined
      ? undefined
      : SUBTIER_NUMERALS[subTier];
  return numeral ? `${tier} ${numeral}` : tier;
}
