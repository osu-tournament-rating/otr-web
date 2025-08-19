import {
  MatchDTO,
  PlayerMatchStatsDTO,
  RatingAdjustmentDTO,
  PlayerCompactDTO,
  MatchWinRecordDTO,
} from '@osu-tournament-rating/otr-api-client';
import { TierName } from '@/lib/utils/tierData';

export type HighlightColor =
  | 'blue'
  | 'red'
  | 'purple'
  | 'orange'
  | 'green'
  | 'amber';

export interface HighlightPlayer {
  id: number;
  username: string;
  avatarUrl: string;
}

export interface HighlightTierIcon {
  tier: TierName;
  subTier: number | undefined;
}

export interface HighlightStat {
  id: string;
  label: string;
  value: string;
  sublabel?: string;
  icon: string;
  color: HighlightColor;
  player?: HighlightPlayer;
  tierIcon?: HighlightTierIcon;
}

export type TeamColor = 'red' | 'blue';

export interface ProcessedPlayerStats {
  playerId: number;
  username: string;
  osuId: number;
  avatarUrl: string;
  team?: TeamColor;
  won: boolean;
  gamesWon: number;
  gamesLost: number;
  gamesPlayed: number;
  ratingBefore: number | null;
  ratingAfter: number | null;
  ratingDelta: number | null;
  volatilityBefore: number | null;
  volatilityAfter: number | null;
  volatilityDelta: number | null;
  averageScore: number;
  averageAccuracy: number;
  averageMisses: number;
  averagePlacement: number;
}

const SCORE_THRESHOLDS = {
  MILLION: 1_000_000,
  HUNDRED_K: 100_000,
  TEN_K: 10_000,
  THOUSAND: 1_000,
} as const;

const RATING_THRESHOLDS = {
  HIGH_GAIN: 10,
  HIGH_LOSS: -10,
  EXTREME: 30,
  MODERATE: 15,
} as const;

const PRECISION = {
  RATING_DECIMAL: 1,
  ACCURACY_DECIMAL: 2,
  MISSES_DECIMAL: 1,
  PLACEMENT_DECIMAL: 1,
} as const;

export function processMatchStatistics(
  match: MatchDTO,
  players: PlayerCompactDTO[]
): ProcessedPlayerStats[] {
  if (
    !match?.playerMatchStats ||
    !Array.isArray(match.playerMatchStats) ||
    match.playerMatchStats.length === 0
  ) {
    return [];
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));

  const ratingAdjustmentMap = new Map<number, RatingAdjustmentDTO>();

  // Map rating adjustments to players by matching array indices
  // The API guarantees rating adjustments are in the same order as playerMatchStats
  // TODO: Once the API client is regenerated with playerId field, update this to use
  // adjustment.playerId for more robust matching instead of relying on array order
  if (
    match.ratingAdjustments &&
    match.ratingAdjustments.length === match.playerMatchStats.length
  ) {
    match.playerMatchStats.forEach((playerStats, index) => {
      const adjustment = match.ratingAdjustments?.[index];
      if (adjustment) {
        ratingAdjustmentMap.set(playerStats.playerId, adjustment);
      }
    });
  }

  const processed: ProcessedPlayerStats[] = [];

  match.playerMatchStats.forEach((playerStats: PlayerMatchStatsDTO) => {
    const playerId = playerStats.playerId;
    const playerInfo = playerMap.get(playerId);
    const ratingAdjustment = ratingAdjustmentMap.get(playerId);

    if (!playerInfo) return;

    processed.push({
      playerId,
      username: playerInfo.username,
      osuId: playerInfo.osuId,
      avatarUrl: `https://a.ppy.sh/${playerInfo.osuId}`,
      won: playerStats.won,
      gamesWon: playerStats.gamesWon,
      gamesLost: playerStats.gamesLost,
      gamesPlayed: playerStats.gamesPlayed,
      ratingBefore: ratingAdjustment?.ratingBefore ?? null,
      ratingAfter: ratingAdjustment?.ratingAfter ?? null,
      ratingDelta: ratingAdjustment?.ratingDelta ?? null,
      volatilityBefore: ratingAdjustment?.volatilityBefore ?? null,
      volatilityAfter: ratingAdjustment?.volatilityAfter ?? null,
      volatilityDelta: ratingAdjustment?.volatilityDelta ?? null,
      averageScore: playerStats.averageScore,
      averageAccuracy: playerStats.averageAccuracy,
      averageMisses: playerStats.averageMisses,
      averagePlacement: playerStats.averagePlacement,
    });
  });

  return processed;
}

function createHighlightPlayer(player: ProcessedPlayerStats): HighlightPlayer {
  return {
    id: player.playerId,
    username: player.username,
    avatarUrl: player.avatarUrl,
  };
}

export function calculateHighlightStats(
  players: ProcessedPlayerStats[],
  matchWinRecord?: MatchWinRecordDTO
): HighlightStat[] {
  const highlights: HighlightStat[] = [];

  if (players.length === 0) {
    return highlights;
  }

  // Calculate total match score using matchWinRecord if available, otherwise use player stats
  if (matchWinRecord) {
    // Use the actual match scoreline from the win record
    const winnerScore = matchWinRecord.winnerPoints;
    const loserScore = matchWinRecord.loserPoints;

    // Determine which team won based on winnerTeam (1=Red, 2=Blue) or if it's a tie
    const isRedWinner = matchWinRecord.winnerTeam === 1;
    const isBlueWinner = matchWinRecord.winnerTeam === 2;
    const isTied = matchWinRecord.isTied;

    // Format score based on team colors or head-to-head
    if (isRedWinner || isBlueWinner) {
      // Team match - show in team color order
      const redScore = isRedWinner ? winnerScore : loserScore;
      const blueScore = isBlueWinner ? winnerScore : loserScore;

      highlights.push({
        id: 'match-score',
        label: 'Match Score',
        value: `${redScore} - ${blueScore}`,
        sublabel: isTied
          ? 'Draw'
          : isRedWinner
            ? 'Red Team Wins'
            : 'Blue Team Wins',
        icon: 'Swords',
        color: isTied ? 'purple' : isRedWinner ? 'red' : 'blue',
      });
    } else {
      // Head-to-head or FFA - show winner vs loser score
      const winner = players.find((p) => p.won);

      highlights.push({
        id: 'match-score',
        label: 'Match Score',
        value: isTied
          ? `${winnerScore} - ${loserScore}`
          : `${winnerScore} - ${loserScore}`,
        sublabel: isTied ? 'Draw' : winner?.username,
        icon: 'Swords',
        color: 'purple',
        player: winner ? createHighlightPlayer(winner) : undefined,
      });
    }
  } else {
    // Fallback to calculating from player stats if no win record available
    const hasTeams = players.some((p) => p.team !== undefined);

    if (hasTeams) {
      // Calculate team scores by looking at the first player from each team
      // In team matches, all players on a team have the same W-L record
      const redPlayer = players.find((p) => p.team === ('red' as TeamColor));
      const bluePlayer = players.find((p) => p.team === ('blue' as TeamColor));

      const redScore = redPlayer?.gamesWon ?? 0;
      const blueScore = bluePlayer?.gamesWon ?? 0;

      highlights.push({
        id: 'match-score',
        label: 'Match Score',
        value: `${redScore} - ${blueScore}`,
        sublabel:
          redScore > blueScore
            ? 'Red Team Wins'
            : blueScore > redScore
              ? 'Blue Team Wins'
              : 'Draw',
        icon: 'Swords',
        color:
          redScore > blueScore
            ? 'red'
            : blueScore > redScore
              ? 'blue'
              : 'purple',
      });
    } else if (players.length === 2) {
      // 1v1 match - show head-to-head score
      const [player1, player2] = players;
      highlights.push({
        id: 'match-score',
        label: 'Match Score',
        value: `${player1.gamesWon} - ${player2.gamesWon}`,
        sublabel: player1.won ? player1.username : player2.username,
        icon: 'Swords',
        color: 'purple',
        player: player1.won
          ? createHighlightPlayer(player1)
          : createHighlightPlayer(player2),
      });
    } else {
      // Free-for-all or other format - show total games played
      const totalGames = Math.max(...players.map((p) => p.gamesPlayed));
      const winner = players.find((p) => p.won);

      highlights.push({
        id: 'match-score',
        label: 'Match Summary',
        value: `${totalGames} games`,
        sublabel: winner ? `${winner.username} wins` : undefined,
        icon: 'Trophy',
        color: 'amber',
        player: winner ? createHighlightPlayer(winner) : undefined,
      });
    }
  }

  const topAccuracy = players.reduce((prev, curr) =>
    curr.averageAccuracy > prev.averageAccuracy ? curr : prev
  );

  highlights.push({
    id: 'accuracy',
    label: 'Accuracy Aficionado',
    value: `${topAccuracy.averageAccuracy.toFixed(PRECISION.ACCURACY_DECIMAL)}% avg`,
    sublabel: topAccuracy.username,
    icon: 'Crosshair',
    color: 'blue',
    player: createHighlightPlayer(topAccuracy),
  });
  const topScorer = players.reduce((prev, curr) =>
    curr.averageScore > prev.averageScore ? curr : prev
  );

  highlights.push({
    id: 'top-scorer',
    label: 'Top Scorer',
    value: formatScore(topScorer.averageScore) + ' avg',
    sublabel: topScorer.username,
    icon: 'Trophy',
    color: 'purple',
    player: createHighlightPlayer(topScorer),
  });

  if (players.length > 2) {
    const mostGames = players.reduce((prev, curr) =>
      curr.gamesPlayed > prev.gamesPlayed ? curr : prev
    );

    const winRate =
      mostGames.gamesPlayed > 0
        ? ((mostGames.gamesWon / mostGames.gamesPlayed) * 100).toFixed(0)
        : '0';

    highlights.push({
      id: 'perma-lobbied',
      label: 'Mainstay',
      value: `${mostGames.gamesPlayed} games`,
      sublabel: `${mostGames.username} (${winRate}% WR)`,
      icon: 'Medal',
      color: 'red',
      player: createHighlightPlayer(mostGames),
    });
  }
  const leastMisses = players.reduce((prev, curr) =>
    curr.averageMisses < prev.averageMisses ? curr : prev
  );

  highlights.push({
    id: 'consistency',
    label: 'Most Consistent',
    value: `${leastMisses.averageMisses.toFixed(PRECISION.MISSES_DECIMAL)} avg misses`,
    sublabel: leastMisses.username,
    icon: 'Shield',
    color: 'orange',
    player: createHighlightPlayer(leastMisses),
  });
  const validRatings = players.filter(
    (p): p is ProcessedPlayerStats & { ratingDelta: number } =>
      p.ratingDelta !== null
  );
  if (validRatings.length > 0) {
    const biggestGain = validRatings.reduce((prev, curr) =>
      curr.ratingDelta > prev.ratingDelta ? curr : prev
    );

    highlights.push({
      id: 'biggest-gain',
      label: 'Biggest Gain',
      value: `${biggestGain.ratingDelta > 0 ? '+' : ''}${biggestGain.ratingDelta.toFixed(0)} TR`,
      sublabel: biggestGain.username,
      icon: 'TrendingUp',
      color: 'green',
      player: createHighlightPlayer(biggestGain),
    });
  }

  return highlights;
}

export function formatScore(score: number): string {
  if (score >= SCORE_THRESHOLDS.MILLION) {
    return `${(score / SCORE_THRESHOLDS.MILLION).toFixed(1)}M`;
  }
  if (score >= SCORE_THRESHOLDS.HUNDRED_K) {
    return `${Math.floor(score / SCORE_THRESHOLDS.THOUSAND)}K`;
  }
  if (score >= SCORE_THRESHOLDS.TEN_K) {
    return `${(score / SCORE_THRESHOLDS.THOUSAND).toFixed(0)}K`;
  }
  if (score >= SCORE_THRESHOLDS.THOUSAND) {
    return `${(score / SCORE_THRESHOLDS.THOUSAND).toFixed(1)}K`;
  }
  return Math.floor(score).toLocaleString();
}

export function getRatingChangeColor(delta: number | null): string {
  if (delta === null) return 'text-muted-foreground';

  const roundedDelta = Math.round(delta * 10) / 10;
  if (roundedDelta === 0) return 'text-gray-500';

  if (delta > 0) {
    return delta > RATING_THRESHOLDS.HIGH_GAIN
      ? 'text-green-600'
      : 'text-green-500';
  }
  return delta < RATING_THRESHOLDS.HIGH_LOSS ? 'text-red-600' : 'text-red-500';
}

export type RatingIntensity = 'low' | 'medium' | 'high';

export function getRatingChangeIntensity(
  delta: number | null
): RatingIntensity {
  if (delta === null) return 'low';

  const abs = Math.abs(delta);
  if (abs > RATING_THRESHOLDS.EXTREME) return 'high';
  if (abs > RATING_THRESHOLDS.MODERATE) return 'medium';
  return 'low';
}
