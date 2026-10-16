import { parseHeroTab } from '@/lib/kit/layout/hero-tabs';

import type { MatchTab } from './MatchHero';

/**
 * The match page's views, in tab order. A plain module, so the server page
 * and the client loading screen read the same list.
 */
export const MATCH_TABS = [
  'games',
  'stats',
] as const satisfies readonly MatchTab[];

/** The view a match address asks for: `?tab=stats`, or Games by default. */
export function parseMatchTab(
  raw: string | string[] | undefined | null
): MatchTab {
  return parseHeroTab(raw ?? undefined, MATCH_TABS, 'games');
}
