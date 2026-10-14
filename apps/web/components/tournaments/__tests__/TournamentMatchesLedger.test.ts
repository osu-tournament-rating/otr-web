import { describe, expect, it } from 'bun:test';
import {
  MatchRejectionReason,
  MatchWarningFlags,
  Team,
  VerificationStatus,
} from '@otr/core/osu';

import { groupMatches } from '@/components/tournaments/TournamentMatchesLedger';
import type { MatchRow } from '@/components/tournaments/matchRow';

const match = (
  id: number,
  startDate: string | null,
  {
    name = `Match ${id}`,
    games = 0,
    margin,
  }: { name?: string; games?: number; margin?: number } = {}
): MatchRow => ({
  id,
  name,
  status: {
    verificationStatus: VerificationStatus.Verified,
    warningFlags: MatchWarningFlags.None,
    rejectionReason: MatchRejectionReason.None,
    verifiedByUsername: null,
  },
  startDate,
  winRecord:
    margin === undefined
      ? null
      : {
          matchId: id,
          isTied: false,
          winnerPoints: 5 + margin,
          loserPoints: 5,
          winnerTeam: Team.Red,
          loserTeam: Team.Blue,
        },
  games: Array.from({ length: games }, (_, index) => ({
    id: id * 100 + index,
    verificationStatus: VerificationStatus.Verified,
    warningFlags: 0,
    rejectionReason: 0,
    startTime: startDate ?? '',
    adminNotes: [],
  })),
  matchAdminNotes: [],
});

// Two play weeks: Sat/Sun Jul 20-21 and Sat Jul 27, 2024, plus an undated match.
const matches = [
  match(1, '2024-07-20T12:00:00Z', { name: 'b', games: 3, margin: 2 }),
  match(2, '2024-07-27T12:00:00Z', { name: 'c', games: 1, margin: 1 }),
  match(3, '2024-07-21T12:00:00Z', { name: 'a', games: 5, margin: 3 }),
  match(4, null, { name: 'd', games: 2 }),
];

const ids = (groups: ReturnType<typeof groupMatches>) =>
  groups.map((group) => group.matches.map((m) => m.id));

describe('groupMatches', () => {
  it('groups date sorts by play week, undated last', () => {
    const newest = groupMatches(matches, 'newest');
    expect(newest.map((group) => group.label)).toEqual([
      'Sat, Jul 27, 2024',
      'Sat, Jul 20 – Sun, Jul 21, 2024',
      'No start time',
    ]);
    expect(ids(newest)).toEqual([[2], [3, 1], [4]]);

    expect(ids(groupMatches(matches, 'oldest'))).toEqual([[1, 3], [2], [4]]);
  });

  it('sorts every other key across the whole tournament', () => {
    for (const [sort, order] of [
      ['name', [3, 1, 2, 4]],
      ['games', [3, 1, 4, 2]],
      ['closest', [2, 1, 3, 4]],
    ] as const) {
      const groups = groupMatches(matches, sort);
      expect(groups).toHaveLength(1);
      expect(groups[0].label).toBeNull();
      expect(ids(groups)).toEqual([[...order]]);
    }
  });

  it('returns no groups without matches', () => {
    expect(groupMatches([], 'newest')).toEqual([]);
    expect(groupMatches([], 'name')).toEqual([]);
  });
});
