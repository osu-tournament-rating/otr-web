import { Ruleset, VerificationStatus } from '@otr/core/osu';
import { describe, expect, it } from 'bun:test';

import { getTournamentRowLabel } from '@/components/tournaments/TournamentListRow';
import type { TournamentListItem } from '@/lib/orpc/schema/tournament';

const note = {} as TournamentListItem['adminNotes'][number];

type LabelInput = Parameters<typeof getTournamentRowLabel>[0];

function tournament(overrides: Partial<LabelInput> = {}): LabelInput {
  return {
    name: 'Break The Meta Cup',
    abbreviation: 'BTMC',
    verificationStatus: VerificationStatus.Verified,
    isLazer: false,
    adminNotes: [],
    ruleset: Ruleset.Osu,
    lobbySize: 1,
    rankRangeLowerBound: 10_000,
    startTime: '2021-12-04T00:00:00Z',
    endTime: '2021-12-18T00:00:00Z',
    ...overrides,
  };
}

describe('getTournamentRowLabel', () => {
  it('reads the row in order, with the status first', () => {
    expect(getTournamentRowLabel(tournament())).toBe(
      'View verified tournament Break The Meta Cup BTMC, osu!, 1v1, 10,000+, Dec 4 – 18, 2021'
    );
    expect(
      getTournamentRowLabel(
        tournament({ verificationStatus: VerificationStatus.Rejected })
      )
    ).toMatch(/^View rejected tournament Break The Meta Cup BTMC, /);
  });

  it('says the undecided states are not in ratings yet', () => {
    expect(
      getTournamentRowLabel(
        tournament({
          verificationStatus: VerificationStatus.PreVerified,
          ruleset: Ruleset.Taiko,
          rankRangeLowerBound: 1,
        })
      )
    ).toBe(
      'View pre-verified tournament Break The Meta Cup BTMC, not in ratings yet, taiko, 1v1, Open rank, Dec 4 – 18, 2021'
    );
    expect(
      getTournamentRowLabel(
        tournament({ verificationStatus: VerificationStatus.None })
      )
    ).toMatch(/^View pending tournament .+, not in ratings yet, /);
  });

  it('adds the lazer tag and ends with the admin note count', () => {
    expect(
      getTournamentRowLabel(
        tournament({
          verificationStatus: VerificationStatus.PreRejected,
          isLazer: true,
          adminNotes: [note, note],
        })
      )
    ).toBe(
      'View pre-rejected tournament Break The Meta Cup BTMC, not in ratings yet, lazer, osu!, 1v1, 10,000+, Dec 4 – 18, 2021, 2 admin notes'
    );
    expect(getTournamentRowLabel(tournament({ adminNotes: [note] }))).toMatch(
      /, 1 admin note$/
    );
  });

  it('leaves out dates the tournament does not have', () => {
    expect(
      getTournamentRowLabel(tournament({ startTime: null, endTime: null }))
    ).toBe(
      'View verified tournament Break The Meta Cup BTMC, osu!, 1v1, 10,000+'
    );
  });
});
