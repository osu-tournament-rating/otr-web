import { Team, VerificationStatus } from '@otr/core/osu';

import { calculateAccuracy } from './accuracy';
import { calculateOtrMatchCosts } from './match-cost-calculator';
import type {
  MatchProcessingResult,
  PlayerMatchStatRecord,
  PlayerTournamentStatRecord,
  StatsCalculationResult,
  StatsMatch,
  StatsTournament,
  StatsGame,
  StatsScore,
} from './types';

interface GameProcessingResult {
  gameId: number;
  rosters: Array<{
    team: Team;
    roster: number[];
    score: number;
  }>;
  verifiedScores: StatsScore[];
  winningTeam: Team | null;
}

const ensureVerified = <T extends { verificationStatus: VerificationStatus }>(
  items: T[]
) =>
  items.filter(
    (item) => item.verificationStatus === VerificationStatus.Verified
  );

const uniqueNumbers = (values: Iterable<number>) => Array.from(new Set(values));

const determineWinningTeam = (scores: StatsScore[]) => {
  const totals = new Map<Team, number>();

  for (const score of scores) {
    const current = totals.get(score.team) ?? 0;
    totals.set(score.team, current + score.score);
  }

  let bestTeam: Team | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const [team, totalScore] of totals.entries()) {
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestTeam = team;
    }
  }

  return bestTeam;
};

const generateGameRosters = (game: StatsGame, scores: StatsScore[]) => {
  if (scores.length === 0) {
    return [];
  }

  const rosterMap = new Map<Team, { players: Set<number>; total: number }>();

  for (const score of scores) {
    const entry = rosterMap.get(score.team) ?? {
      players: new Set<number>(),
      total: 0,
    };
    entry.players.add(score.playerId);
    entry.total += score.score;
    rosterMap.set(score.team, entry);
  }

  return Array.from(rosterMap.entries()).map(([team, entry]) => ({
    team,
    roster: Array.from(entry.players),
    score: entry.total,
    gameId: game.id,
  }));
};

const generateMatchRosters = (
  matchId: number,
  gameResults: GameProcessingResult[]
) => {
  if (gameResults.length === 0) {
    return [];
  }

  const rosterMap = new Map<Team, Set<number>>();
  const points = new Map<Team, number>();

  for (const result of gameResults) {
    for (const roster of result.rosters) {
      const existing = rosterMap.get(roster.team) ?? new Set<number>();
      roster.roster.forEach((playerId) => existing.add(playerId));
      rosterMap.set(roster.team, existing);
    }

    if (result.winningTeam != null) {
      const current = points.get(result.winningTeam) ?? 0;
      points.set(result.winningTeam, current + 1);
    }
  }

  return Array.from(rosterMap.entries()).map(([team, players]) => ({
    matchId,
    team,
    roster: Array.from(players),
    score: points.get(team) ?? 0,
  }));
};

const calculateAccuracyForScore = (score: StatsScore) =>
  calculateAccuracy({
    ruleset: score.ruleset,
    count300: score.count300,
    count100: score.count100,
    count50: score.count50,
    countMiss: score.countMiss,
    countKatu: score.countKatu,
    countGeki: score.countGeki,
  });

export class TournamentStatsCalculator {
  calculateAllStatistics(tournament: StatsTournament): StatsCalculationResult {
    if (tournament.verificationStatus !== VerificationStatus.Verified) {
      return {
        success: false,
        errorMessage: `Tournament ${tournament.id} is not verified (status: ${tournament.verificationStatus})`,
      };
    }

    const verifiedMatches = ensureVerified(tournament.matches);

    if (verifiedMatches.length === 0) {
      return {
        success: false,
        errorMessage: `No verified matches found for tournament ${tournament.id}`,
      };
    }

    const matchResults: MatchProcessingResult[] = [];
    let totalPlayerMatchStats = 0;

    for (const match of verifiedMatches) {
      const matchResult = this.processMatch(match);
      if (!matchResult) {
        return {
          success: false,
          errorMessage: `Failed to process match statistics for match ${match.id} in tournament ${tournament.id}`,
        };
      }

      matchResults.push(matchResult);
      totalPlayerMatchStats += matchResult.playerMatchStats.length;
    }

    if (!this.validateProcessorData(verifiedMatches)) {
      return {
        success: false,
        errorMessage: `Missing processor data for tournament ${tournament.id}`,
      };
    }

    const playerTournamentStats = this.aggregateTournamentStats(
      tournament,
      verifiedMatches,
      matchResults
    );

    return {
      success: true,
      verifiedMatchesCount: verifiedMatches.length,
      playerMatchStatsCount: totalPlayerMatchStats,
      playerTournamentStatsCount: playerTournamentStats.length,
      matches: matchResults,
      playerTournamentStats,
    };
  }

  private processMatch(match: StatsMatch): MatchProcessingResult | null {
    if (match.verificationStatus !== VerificationStatus.Verified) {
      return null;
    }

    const verifiedGames = ensureVerified(match.games);
    if (verifiedGames.length === 0) {
      return null;
    }

    const gameResults: GameProcessingResult[] = [];

    for (const game of verifiedGames) {
      const result = this.processGame(game);
      if (!result || result.rosters.length === 0) {
        return null;
      }
      gameResults.push(result);
    }

    const matchRosters = generateMatchRosters(match.id, gameResults);

    const playerMatchStats = this.generatePlayerMatchStatistics(
      match,
      verifiedGames,
      gameResults,
      matchRosters
    );

    return {
      matchId: match.id,
      matchRosters,
      gameRosters: gameResults.map((result) => ({
        gameId: result.gameId,
        rosters: result.rosters,
      })),
      playerMatchStats,
    };
  }

  private processGame(game: StatsGame): GameProcessingResult | null {
    if (game.verificationStatus !== VerificationStatus.Verified) {
      return null;
    }

    const verifiedScores = ensureVerified(game.scores);
    if (verifiedScores.length === 0) {
      return null;
    }

    const orderedScores = [...verifiedScores].sort((a, b) => b.score - a.score);
    const rosters = generateGameRosters(game, orderedScores);
    const winningTeam = determineWinningTeam(orderedScores);

    return {
      gameId: game.id,
      rosters,
      winningTeam,
      verifiedScores: orderedScores,
    };
  }

  private generatePlayerMatchStatistics(
    match: StatsMatch,
    verifiedGames: StatsGame[],
    gameResults: GameProcessingResult[],
    matchRosters: Array<{
      team: Team;
      roster: number[];
      score: number;
    }>
  ): PlayerMatchStatRecord[] {
    const matchCosts = calculateOtrMatchCosts(verifiedGames);
    const playerScores = new Map<number, StatsScore[]>();
    const winningTeamByGame = new Map<number, Team | null>();

    for (const result of gameResults) {
      winningTeamByGame.set(result.gameId, result.winningTeam);
      for (const score of result.verifiedScores) {
        const list = playerScores.get(score.playerId) ?? [];
        list.push(score);
        playerScores.set(score.playerId, list);
      }
    }

    const maxMatchScore =
      matchRosters.length > 0
        ? Math.max(...matchRosters.map((roster) => roster.score))
        : 0;

    const stats: PlayerMatchStatRecord[] = [];

    for (const [playerId, scores] of playerScores.entries()) {
      const gamesPlayed = scores.length;

      const averageScore =
        scores.reduce((sum, score) => sum + score.score, 0) / gamesPlayed;
      const averagePlacement =
        scores.reduce((sum, score) => sum + score.placement, 0) / gamesPlayed;
      const averageMisses =
        scores.reduce((sum, score) => sum + score.countMiss, 0) / gamesPlayed;
      const averageAccuracy =
        scores.reduce(
          (sum, score) => sum + calculateAccuracyForScore(score),
          0
        ) / gamesPlayed;

      let gamesWon = 0;
      let gamesLost = 0;

      const uniqueGameIds = new Set(scores.map((score) => score.gameId));

      for (const gameId of uniqueGameIds) {
        const score = scores.find((s) => s.gameId === gameId);
        if (!score) {
          continue;
        }
        const winningTeam = winningTeamByGame.get(gameId);
        if (winningTeam == null) {
          continue;
        }
        if (winningTeam === score.team) {
          gamesWon += 1;
        } else {
          gamesLost += 1;
        }
      }

      const matchRoster = matchRosters.find((roster) =>
        roster.roster.includes(playerId)
      );
      const teammateIds = matchRoster
        ? uniqueNumbers(matchRoster.roster.filter((id) => id !== playerId))
        : [];
      const opponentIds = matchRosters
        .filter((roster) => roster.team !== matchRoster?.team)
        .flatMap((roster) => roster.roster)
        .filter((id) => id !== playerId);

      const matchCost = matchCosts.get(playerId) ?? 0;
      const won = matchRoster ? matchRoster.score === maxMatchScore : false;

      stats.push({
        playerId,
        matchId: match.id,
        matchCost,
        averageScore,
        averagePlacement,
        averageMisses,
        averageAccuracy,
        gamesPlayed,
        gamesWon,
        gamesLost,
        won,
        teammateIds,
        opponentIds: uniqueNumbers(opponentIds),
      });
    }

    return stats;
  }

  private validateProcessorData(matches: StatsMatch[]) {
    return matches.every((match) => match.playerRatingAdjustments.length > 0);
  }

  private aggregateTournamentStats(
    tournament: StatsTournament,
    matches: StatsMatch[],
    matchResults: MatchProcessingResult[]
  ): PlayerTournamentStatRecord[] {
    const matchById = new Map(
      matches.map((match) => [match.id, match] as const)
    );
    const aggregateMap = new Map<
      number,
      {
        matchStats: PlayerMatchStatRecord[];
        ratingDeltas: number[];
        teammateIds: Set<number>;
      }
    >();

    for (const matchResult of matchResults) {
      const match = matchById.get(matchResult.matchId);
      if (!match) {
        continue;
      }

      for (const stat of matchResult.playerMatchStats) {
        const adjustments = match.playerRatingAdjustments.filter(
          (adjustment) => adjustment.playerId === stat.playerId
        );

        if (adjustments.length === 0) {
          continue;
        }

        const entry = aggregateMap.get(stat.playerId) ?? {
          matchStats: [],
          ratingDeltas: [],
          teammateIds: new Set<number>(),
        };

        entry.matchStats.push(stat);
        adjustments.forEach((adjustment) => {
          entry.ratingDeltas.push(
            adjustment.ratingAfter - adjustment.ratingBefore
          );
        });
        stat.teammateIds.forEach((id) => entry.teammateIds.add(id));

        aggregateMap.set(stat.playerId, entry);
      }
    }

    const results: PlayerTournamentStatRecord[] = [];

    for (const [playerId, data] of aggregateMap.entries()) {
      if (data.ratingDeltas.length === 0 || data.matchStats.length === 0) {
        continue;
      }

      const matchesPlayed = data.matchStats.length;
      const matchesWon = data.matchStats.filter((stat) => stat.won).length;
      const matchesLost = matchesPlayed - matchesWon;
      const gamesPlayed = data.matchStats.reduce(
        (sum, stat) => sum + stat.gamesPlayed,
        0
      );
      const gamesWon = data.matchStats.reduce(
        (sum, stat) => sum + stat.gamesWon,
        0
      );
      const gamesLost = data.matchStats.reduce(
        (sum, stat) => sum + stat.gamesLost,
        0
      );

      const averageMatchCost =
        data.matchStats.reduce((sum, stat) => sum + stat.matchCost, 0) /
        matchesPlayed;
      const averageScore =
        data.matchStats.reduce((sum, stat) => sum + stat.averageScore, 0) /
        matchesPlayed;
      const averagePlacement =
        data.matchStats.reduce((sum, stat) => sum + stat.averagePlacement, 0) /
        matchesPlayed;
      const averageAccuracy =
        data.matchStats.reduce((sum, stat) => sum + stat.averageAccuracy, 0) /
        matchesPlayed;

      const averageRatingDelta =
        data.ratingDeltas.reduce((sum, delta) => sum + delta, 0) /
        data.ratingDeltas.length;

      results.push({
        playerId,
        tournamentId: tournament.id,
        averageRatingDelta,
        averageMatchCost,
        averageScore: Math.trunc(averageScore),
        averagePlacement,
        averageAccuracy,
        matchesPlayed,
        matchesWon,
        matchesLost,
        gamesPlayed,
        gamesWon,
        gamesLost,
        matchWinRate: matchesPlayed > 0 ? matchesWon / matchesPlayed : 0,
        teammateIds: Array.from(data.teammateIds),
      });
    }

    return results;
  }
}
