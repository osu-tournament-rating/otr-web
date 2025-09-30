import { beforeEach, describe, expect, it } from 'bun:test';
import { TournamentRejectionReason, VerificationStatus } from '@otr/core/osu';

import { TournamentAutomationChecks } from '../tournament-automation-checks';
import {
  createGame,
  createMatch,
  createTournament,
  resetIds,
} from '../test-utils';

describe('TournamentAutomationChecks', () => {
  const checker = new TournamentAutomationChecks();

  beforeEach(() => {
    resetIds();
  });

  it('returns NoVerifiedMatches when no matches pass', () => {
    const match = createMatch({
      games: [createGame({})],
      verificationStatus: VerificationStatus.PreRejected,
    });
    const tournament = createTournament({ matches: [match] });

    const result = checker.process(tournament);

    expect(result).toBe(TournamentRejectionReason.NoVerifiedMatches);
  });

  it('returns None when enough matches are verified', () => {
    const matches = Array.from({ length: 10 }, (_, index) =>
      createMatch({
        games: [createGame({})],
        verificationStatus:
          index < 8
            ? VerificationStatus.PreVerified
            : VerificationStatus.PreRejected,
      })
    );
    const tournament = createTournament({ matches });

    const result = checker.process(tournament);

    expect(result).toBe(TournamentRejectionReason.None);
  });

  it('ignores matches without games', () => {
    const verifiedMatches = Array.from({ length: 8 }, () =>
      createMatch({
        games: [createGame({})],
        verificationStatus: VerificationStatus.PreVerified,
      })
    );
    const emptyMatches = Array.from({ length: 5 }, () =>
      createMatch({
        games: [],
        verificationStatus: VerificationStatus.PreRejected,
      })
    );

    const tournament = createTournament({
      matches: [...verifiedMatches, ...emptyMatches],
    });

    const result = checker.process(tournament);

    expect(result).toBe(TournamentRejectionReason.None);
  });

  it('returns NotEnoughVerifiedMatches when below 80%', () => {
    const matches = Array.from({ length: 10 }, (_, index) =>
      createMatch({
        games: [createGame({})],
        verificationStatus:
          index < 7
            ? VerificationStatus.PreVerified
            : VerificationStatus.PreRejected,
      })
    );
    const tournament = createTournament({ matches });

    const result = checker.process(tournament);

    expect(result).toBe(TournamentRejectionReason.NotEnoughVerifiedMatches);
  });

  it('handles tournaments with no matches gracefully', () => {
    const tournament = createTournament({ matches: [] });

    const result = checker.process(tournament);

    expect(result).toBe(TournamentRejectionReason.NoVerifiedMatches);
  });
});
