import {
  GameRejectionReason,
  MatchRejectionReason,
  MatchWarningFlags,
  Team,
  TeamType,
  VerificationStatus,
} from '@otr/core/osu';

import type { AutomationMatch, AutomationTournament } from './types';
import { ensureMatchRosters, rosterOverlaps } from './rosters-helper';
import {
  addWarningFlag,
  isPlaceholderDate,
  isPreVerifiedOrVerified,
} from './utils';

export interface MatchAutomationChecksOptions {
  logger?: {
    trace(message: string, context?: Record<string, unknown>): void;
    info?(message: string, context?: Record<string, unknown>): void;
  };
}

export class MatchAutomationChecks {
  private readonly logger?: MatchAutomationChecksOptions['logger'];

  constructor(options: MatchAutomationChecksOptions = {}) {
    this.logger = options.logger;
  }

  process(
    match: AutomationMatch,
    tournament: AutomationTournament
  ): MatchRejectionReason {
    match.warningFlags = MatchWarningFlags.None;

    this.applyBeatmapWarning(match);
    this.applyNameFormatWarning(match);
    this.checkRosterIntegrity(match);

    let rejection = MatchRejectionReason.None;

    rejection |= this.checkEndTime(match);
    rejection |= this.checkGameCounts(match);
    rejection |= this.checkNamePrefix(match, tournament);

    if (
      rejection !== MatchRejectionReason.None ||
      match.warningFlags !== MatchWarningFlags.None
    ) {
      this.logger?.trace('Match automation processed', {
        matchId: match.id,
        rejection,
        warningFlags: match.warningFlags,
      });
    }

    return rejection;
  }

  performHeadToHeadConversion(
    match: AutomationMatch,
    tournament: AutomationTournament
  ): void {
    if (tournament.lobbySize !== 1) {
      this.logger?.trace('Skipping head-to-head conversion due to lobby size', {
        matchId: match.id,
        lobbySize: tournament.lobbySize,
      });
      return;
    }

    const eligibleGames = match.games.filter((game) => {
      if (game.teamType !== TeamType.HeadToHead) {
        return false;
      }

      if (game.verificationStatus === VerificationStatus.Rejected) {
        return false;
      }

      const playableScores = game.scores.filter(
        (score) => score.verificationStatus !== VerificationStatus.Rejected
      );

      return (
        playableScores.length === HeadToHeadConstants.ExpectedPlayerCount ||
        playableScores.length === 1
      );
    });

    if (eligibleGames.length === 0) {
      this.logger?.trace('No head-to-head games eligible for conversion', {
        matchId: match.id,
      });
      return;
    }

    const uniquePlayerIds = Array.from(
      new Set(
        match.games
          .flatMap((game) => game.scores)
          .filter(
            (score) => score.verificationStatus !== VerificationStatus.Rejected
          )
          .map((score) => score.playerId)
      )
    );

    if (!this.validatePlayerCount(match, eligibleGames, uniquePlayerIds)) {
      return;
    }

    if (!this.validateGamePlayers(match, uniquePlayerIds)) {
      return;
    }

    const { redPlayerId, bluePlayerId } = this.determineTeamAssignments(
      match,
      uniquePlayerIds
    );

    this.convertGamesToTeamVs(eligibleGames, redPlayerId, bluePlayerId);

    this.logger?.info?.('Converted head-to-head games to TeamVs', {
      matchId: match.id,
      redPlayerId,
      bluePlayerId,
    });
  }

  private checkEndTime(match: AutomationMatch): MatchRejectionReason {
    if (!match.endTime || isPlaceholderDate(match.endTime)) {
      this.logger?.trace('Match automation check: missing end time', {
        matchId: match.id,
        endTime: match.endTime,
      });
      return MatchRejectionReason.NoEndTime;
    }

    return MatchRejectionReason.None;
  }

  private checkGameCounts(match: AutomationMatch): MatchRejectionReason {
    if (match.games.length === 0) {
      this.logger?.trace('Match automation check: no games', {
        matchId: match.id,
      });
      return MatchRejectionReason.NoGames;
    }

    const validGames = match.games.filter((game) =>
      isPreVerifiedOrVerified(game.verificationStatus)
    );

    if (validGames.length === 0) {
      this.logger?.trace('Match automation check: no valid games', {
        matchId: match.id,
      });
      return MatchRejectionReason.NoValidGames;
    }

    if (validGames.length < 3) {
      this.logger?.trace('Match automation check: unexpected game count', {
        matchId: match.id,
        validGames: validGames.length,
      });
      return MatchRejectionReason.UnexpectedGameCount;
    }

    if (validGames.length === 3 || validGames.length === 4) {
      match.warningFlags = addWarningFlag(
        match.warningFlags,
        MatchWarningFlags.LowGameCount
      );
    }

    return MatchRejectionReason.None;
  }

  private checkNamePrefix(
    match: AutomationMatch,
    tournament: AutomationTournament
  ): MatchRejectionReason {
    if (
      match.name.toLowerCase().startsWith(tournament.abbreviation.toLowerCase())
    ) {
      return MatchRejectionReason.None;
    }

    this.logger?.trace('Match automation check: name prefix mismatch', {
      matchId: match.id,
      matchName: match.name,
      abbreviation: tournament.abbreviation,
    });

    return MatchRejectionReason.NamePrefixMismatch;
  }

  private applyBeatmapWarning(match: AutomationMatch) {
    const games = [...match.games].sort((a, b) => {
      const startA = a.startTime ?? '';
      const startB = b.startTime ?? '';
      return startA.localeCompare(startB);
    });

    if (games.length < 3) {
      return;
    }

    const extraGames = games.slice(2);
    if (
      extraGames.some(
        (game) =>
          (game.rejectionReason & GameRejectionReason.BeatmapNotPooled) ===
          GameRejectionReason.BeatmapNotPooled
      )
    ) {
      match.warningFlags = addWarningFlag(
        match.warningFlags,
        MatchWarningFlags.UnexpectedBeatmapsFound
      );
    }
  }

  private applyNameFormatWarning(match: AutomationMatch) {
    const matchesPattern = MATCH_NAME_PATTERNS.some((pattern) =>
      pattern.test(match.name)
    );

    if (!matchesPattern) {
      match.warningFlags = addWarningFlag(
        match.warningFlags,
        MatchWarningFlags.UnexpectedNameFormat
      );
    }
  }

  private checkRosterIntegrity(match: AutomationMatch) {
    const validGames = match.games.filter((game) =>
      isPreVerifiedOrVerified(game.verificationStatus)
    );

    const rosters = ensureMatchRosters({ ...match, games: validGames });

    if (rosterOverlaps(rosters)) {
      match.warningFlags = addWarningFlag(
        match.warningFlags,
        MatchWarningFlags.OverlappingRosters
      );
    }
  }

  private validatePlayerCount(
    match: AutomationMatch,
    headToHeadGames: AutomationMatch['games'],
    uniquePlayerIds: number[]
  ): boolean {
    if (uniquePlayerIds.length === HeadToHeadConstants.ExpectedPlayerCount) {
      return true;
    }

    this.logger?.info?.('Head-to-head conversion failed: player count', {
      matchId: match.id,
      playerCount: uniquePlayerIds.length,
    });

    match.rejectionReason |= MatchRejectionReason.FailedTeamVsConversion;
    for (const game of headToHeadGames) {
      game.rejectionReason |= GameRejectionReason.FailedTeamVsConversion;
    }

    return false;
  }

  private validateGamePlayers(
    match: AutomationMatch,
    uniquePlayerIds: number[]
  ): boolean {
    for (const game of match.games) {
      if (game.verificationStatus === VerificationStatus.Rejected) {
        continue;
      }

      const gamePlayers = game.scores
        .filter(
          (score) => score.verificationStatus !== VerificationStatus.Rejected
        )
        .map((score) => score.playerId);

      const unexpectedPlayer = gamePlayers.some(
        (playerId) => !uniquePlayerIds.includes(playerId)
      );

      if (
        unexpectedPlayer ||
        gamePlayers.length > HeadToHeadConstants.ExpectedPlayerCount
      ) {
        this.logger?.info?.(
          'Head-to-head conversion failed: unexpected players',
          {
            matchId: match.id,
            gameId: game.id,
          }
        );

        game.rejectionReason |= GameRejectionReason.FailedTeamVsConversion;
        game.rejectionReason |= GameRejectionReason.LobbySizeMismatch;
        return false;
      }
    }

    return true;
  }

  private determineTeamAssignments(
    match: AutomationMatch,
    uniquePlayerIds: number[]
  ): { redPlayerId: number; bluePlayerId: number } {
    const sortedGames = [...match.games].sort((a, b) => {
      const startA = a.startTime ?? '';
      const startB = b.startTime ?? '';
      return startA.localeCompare(startB);
    });
    const halfwayIndex = Math.floor(sortedGames.length / 2);
    const halfwayGame = sortedGames[halfwayIndex];

    const players = halfwayGame.scores
      .filter(
        (score) => score.verificationStatus !== VerificationStatus.Rejected
      )
      .map((score) => score.playerId)
      .sort((a, b) => a - b);

    if (players.length >= HeadToHeadConstants.ExpectedPlayerCount) {
      return { redPlayerId: players[0]!, bluePlayerId: players[1]! };
    }

    if (players.length === 1) {
      const other = uniquePlayerIds.find((id) => id !== players[0]);
      if (other != null) {
        return { redPlayerId: players[0]!, bluePlayerId: other };
      }
    }

    const ordered = [...uniquePlayerIds].sort((a, b) => a - b);
    return {
      redPlayerId: ordered[0]!,
      bluePlayerId: ordered[ordered.length - 1]!,
    };
  }

  private convertGamesToTeamVs(
    headToHeadGames: AutomationMatch['games'],
    redPlayerId: number,
    bluePlayerId: number
  ) {
    for (const game of headToHeadGames) {
      const scores = game.scores.filter(
        (score) => score.verificationStatus !== VerificationStatus.Rejected
      );

      if (scores.length === HeadToHeadConstants.ExpectedPlayerCount) {
        const redScore = scores.find((score) => score.playerId === redPlayerId);
        const blueScore = scores.find(
          (score) => score.playerId === bluePlayerId
        );

        if (redScore) {
          redScore.team = Team.Red;
        }

        if (blueScore) {
          blueScore.team = Team.Blue;
        }
      } else if (scores.length === 1) {
        scores[0]!.team =
          scores[0]!.playerId === redPlayerId ? Team.Red : Team.Blue;
      }

      game.teamType = TeamType.TeamVs;
    }
  }
}

export const MATCH_NAME_PATTERNS = [/^.*(\(.+\)\s*vs\.?\s*\(.+\)).*$/i];

export const enum HeadToHeadConstants {
  ExpectedPlayerCount = 2,
}
