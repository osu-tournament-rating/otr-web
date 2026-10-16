import type { MatchDetail } from '@/lib/orpc/schema/match';

/** The display name of a match, which may be stored blank. */
export function getMatchDisplayName(match: Pick<MatchDetail, 'id' | 'name'>) {
  return match.name || `Match ${match.id}`;
}
