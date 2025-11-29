import type { TournamentListItem } from '@/lib/orpc/schema/tournament';

export const mockTournamentListItem: TournamentListItem = {
  id: 1,
  created: '2024-01-01T00:00:00.000Z',
  name: 'Test Tournament 2024',
  abbreviation: 'TT24',
  forumUrl: 'https://osu.ppy.sh/community/forums/topics/12345',
  rankRangeLowerBound: 10000,
  ruleset: 0,
  lobbySize: 4,
  startTime: '2024-06-01T00:00:00.000Z',
  endTime: '2024-06-15T00:00:00.000Z',
  verificationStatus: 1,
  rejectionReason: 0,
  isLazer: false,
  submittedByUsername: 'Submitter',
  verifiedByUsername: 'Verifier',
};

export const mockTournamentList: TournamentListItem[] = [
  mockTournamentListItem,
  {
    ...mockTournamentListItem,
    id: 2,
    name: 'Another Tournament',
    abbreviation: 'AT24',
    startTime: '2024-07-01T00:00:00.000Z',
    endTime: '2024-07-15T00:00:00.000Z',
  },
  {
    ...mockTournamentListItem,
    id: 3,
    name: 'Third Tournament',
    abbreviation: 'TT3',
    ruleset: 1,
    startTime: '2024-08-01T00:00:00.000Z',
    endTime: '2024-08-10T00:00:00.000Z',
  },
];
