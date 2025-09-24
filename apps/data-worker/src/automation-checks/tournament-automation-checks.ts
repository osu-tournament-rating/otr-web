import { TournamentRejectionReason } from '@otr/core/osu';

import type { AutomationTournament } from './types';
import { isPreVerifiedOrVerified } from './utils';

export interface TournamentAutomationChecksOptions {
  logger?: {
    trace(message: string, context?: Record<string, unknown>): void;
  };
}

export class TournamentAutomationChecks {
  private readonly logger?: TournamentAutomationChecksOptions['logger'];

  constructor(options: TournamentAutomationChecksOptions = {}) {
    this.logger = options.logger;
  }

  process(tournament: AutomationTournament): TournamentRejectionReason {
    const matchesWithGames = tournament.matches.filter(
      (match) => match.games.length > 0
    );

    if (matchesWithGames.length === 0) {
      this.logger?.trace('Tournament automation: no matches with games', {
        tournamentId: tournament.id,
      });
      return TournamentRejectionReason.NoVerifiedMatches;
    }

    const verifiedMatches = matchesWithGames.filter((match) =>
      isPreVerifiedOrVerified(match.verificationStatus)
    );

    if (verifiedMatches.length === 0) {
      this.logger?.trace('Tournament automation: no verified matches', {
        tournamentId: tournament.id,
      });
      return TournamentRejectionReason.NoVerifiedMatches;
    }

    const verificationRatio = verifiedMatches.length / matchesWithGames.length;

    if (verificationRatio < VERIFIED_MATCHES_THRESHOLD) {
      this.logger?.trace(
        'Tournament automation: insufficient verified matches',
        {
          tournamentId: tournament.id,
          verifiedMatches: verifiedMatches.length,
          totalMatches: matchesWithGames.length,
          ratio: verificationRatio,
        }
      );
      return TournamentRejectionReason.NotEnoughVerifiedMatches;
    }

    return TournamentRejectionReason.None;
  }
}

export const VERIFIED_MATCHES_THRESHOLD = 0.8;
