import type { TierName } from '@/lib/utils/tierData';

import { themeColor, type ThemeColor } from './theme-color';

function tier(name: string, light: string, dark: string): ThemeColor {
  return themeColor(`--tier-${name}`, light, dark, 'text');
}

/**
 * Tier colours, stepped per theme so tier names clear 4.5:1 as text. Also the
 * mark colour for tier rows in charts. Use the `text-tier-<name>` classes for
 * text and `.css` for chart fills.
 */
export const TIER_PALETTE: Readonly<Record<TierName, ThemeColor>> = {
  Bronze: tier('bronze', '#aa5800', '#c8732d'),
  Silver: tier('silver', '#6d6d6d', '#b3b3b3'),
  Gold: tier('gold', '#896904', '#ddb246'),
  Platinum: tier('platinum', '#0d7699', '#3691b5'),
  Emerald: tier('emerald', '#027f3d', '#2dd26f'),
  Diamond: tier('diamond', '#9c43c7', '#b961e5'),
  Master: tier('master', '#8b44e5', '#a467ff'),
  Grandmaster: tier('grandmaster', '#d81821', '#f9433e'),
  'Elite Grandmaster': tier('elite-grandmaster', '#256acf', '#4e93fc'),
};

/** Tailwind text classes for each tier, spelled out so Tailwind finds them. */
export const TIER_TEXT_CLASS: Readonly<Record<TierName, string>> = {
  Bronze: 'text-tier-bronze',
  Silver: 'text-tier-silver',
  Gold: 'text-tier-gold',
  Platinum: 'text-tier-platinum',
  Emerald: 'text-tier-emerald',
  Diamond: 'text-tier-diamond',
  Master: 'text-tier-master',
  Grandmaster: 'text-tier-grandmaster',
  'Elite Grandmaster': 'text-tier-elite-grandmaster',
};

export function getTierColor(tierName: TierName): string {
  return TIER_PALETTE[tierName].css;
}
