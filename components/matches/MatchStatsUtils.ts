import {
  MatchStatisticsDTO,
  PlayerMatchStatsDTO,
  RatingAdjustmentDTO,
  PlayerCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import { TierName, getTierFromRating } from '@/lib/utils/tierData';

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
  stats: MatchStatisticsDTO,
  players: PlayerCompactDTO[]
): ProcessedPlayerStats[] {
  if (
    !stats?.playerMatchStats ||
    !Array.isArray(stats.playerMatchStats) ||
    stats.playerMatchStats.length === 0
  ) {
    return [];
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));

  const ratingAdjustmentMap = new Map<number, RatingAdjustmentDTO>();

  if (stats.ratingAdjustments?.length === stats.playerMatchStats.length) {
    stats.playerMatchStats.forEach((playerStats, index) => {
      const adjustment = stats.ratingAdjustments[index];
      if (adjustment) {
        ratingAdjustmentMap.set(playerStats.playerId, adjustment);
      }
    });
  }

  const processed: ProcessedPlayerStats[] = [];

  stats.playerMatchStats.forEach((playerStats: PlayerMatchStatsDTO) => {
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
  players: ProcessedPlayerStats[]
): HighlightStat[] {
  const highlights: HighlightStat[] = [];

  if (players.length === 0) {
    return highlights;
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

  const playersWithRatings = players.filter(
    (p): p is ProcessedPlayerStats & { ratingAfter: number } =>
      p.ratingAfter !== null
  );
  if (playersWithRatings.length > 0) {
    const ratings = playersWithRatings.map((p) => p.ratingAfter);
    const averageRating =
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

    const tierInfo = getTierFromRating(averageRating);

    highlights.push({
      id: 'average-tr',
      label: 'Average Rating',
      value: `${averageRating.toFixed(0)} TR`,
      icon: 'Swords',
      color: 'amber',
      tierIcon: {
        tier: tierInfo.tier,
        subTier: tierInfo.subTier,
      },
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
