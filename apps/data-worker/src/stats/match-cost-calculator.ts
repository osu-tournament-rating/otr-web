import { VerificationStatus } from '@otr/core/osu';

import type { StatsGame } from './types';
import { sampleStandardDeviation, standardNormalCdf } from './math';

export const calculateOtrMatchCosts = (games: StatsGame[]) => {
  const playerZScores = new Map<number, number[]>();

  for (const game of games) {
    const verifiedScores = game.scores.filter(
      (score) => score.verificationStatus === VerificationStatus.Verified
    );

    if (verifiedScores.length === 0) {
      continue;
    }

    const scores = verifiedScores.map((score) => score.score);
    const averageScore =
      scores.reduce((sum, value) => sum + value, 0) / scores.length;
    const stdev = sampleStandardDeviation(scores) || 1;

    for (const score of verifiedScores) {
      const playerScores = playerZScores.get(score.playerId) ?? [];
      playerScores.push((score.score - averageScore) / stdev);
      playerZScores.set(score.playerId, playerScores);
    }
  }

  const gamesCount = games.length;
  const denominator = gamesCount > 1 ? gamesCount - 1 : 1;
  const playerMatchCosts = new Map<number, number>();

  for (const [playerId, zScores] of playerZScores.entries()) {
    if (zScores.length === 0) {
      playerMatchCosts.set(playerId, 0);
      continue;
    }

    const averagePercentile =
      zScores.reduce((sum, value) => sum + standardNormalCdf(value), 0) /
      zScores.length;

    const numerator = zScores.length > 1 ? zScores.length - 1 : 0;
    const performanceBonus = 1 + 0.3 * Math.sqrt(numerator / denominator);

    playerMatchCosts.set(
      playerId,
      (averagePercentile + 0.5) * performanceBonus
    );
  }

  return playerMatchCosts;
};
