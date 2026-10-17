import { describe, expect, it } from 'bun:test';

import { getPhoneDescription } from '@/components/tournaments/TournamentRatingsView';
import type { TournamentPlayerStats } from '@/lib/orpc/schema/tournament';

const row = {
  matchesWon: 7,
  matchesLost: 1,
  gamesWon: 40,
  gamesLost: 12,
  ratingBefore: 1271.6,
  ratingAfter: 1697.2,
  averageRatingDelta: -3.25,
} as TournamentPlayerStats;

describe('getPhoneDescription', () => {
  it('shows the record and the rating change by default', () => {
    expect(getPhoneDescription(row, 'total')).toBe(
      'Matches 7–1 · 1,272 → 1,697'
    );
    expect(getPhoneDescription(row, 'player')).toBe(
      'Matches 7–1 · 1,272 → 1,697'
    );
  });

  it('leads with the sorted column when phones hide it', () => {
    expect(getPhoneDescription(row, 'games')).toBe(
      'Games 40–12 · Matches 7–1 · 1,272 → 1,697'
    );
    expect(getPhoneDescription(row, 'average')).toBe(
      'Avg. change −3.3 · Matches 7–1 · 1,272 → 1,697'
    );
    expect(getPhoneDescription(row, 'after')).toBe(
      '1,272 → 1,697 · Matches 7–1'
    );
  });
});
