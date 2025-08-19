import {
  MatchStatisticsDTO,
  PlayerMatchStatsDTO,
  RatingAdjustmentDTO,
  PlayerCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import { TierName, getTierFromRating } from '@/lib/utils/tierData';

export interface HighlightStat {
  id: string;
  label: string;
  value: string;
  sublabel?: string;
  icon: string;
  color: 'blue' | 'red' | 'purple' | 'orange' | 'green' | 'amber';
  player?: {
    id: number;
    username: string;
    avatarUrl: string;
  };
  tierIcon?: {
    tier: TierName;
    subTier: number | undefined;
  };
}

export interface ProcessedPlayerStats {
  playerId: number;
  username: string;
  osuId: number;
  avatarUrl: string;
  team?: 'red' | 'blue';
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
    value: `${topAccuracy.averageAccuracy.toFixed(2)}% avg`,
    sublabel: topAccuracy.username,
    icon: 'Crosshair',
    color: 'blue',
    player: {
      id: topAccuracy.playerId,
      username: topAccuracy.username,
      avatarUrl: topAccuracy.avatarUrl,
    },
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
    player: {
      id: topScorer.playerId,
      username: topScorer.username,
      avatarUrl: topScorer.avatarUrl,
    },
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
      player: {
        id: mostGames.playerId,
        username: mostGames.username,
        avatarUrl: mostGames.avatarUrl,
      },
    });
  }
  const leastMisses = players.reduce((prev, curr) =>
    curr.averageMisses < prev.averageMisses ? curr : prev
  );

  highlights.push({
    id: 'consistency',
    label: 'Consistency King',
    value: `${leastMisses.averageMisses.toFixed(1)} avg misses`,
    sublabel: leastMisses.username,
    icon: 'Shield',
    color: 'orange',
    player: {
      id: leastMisses.playerId,
      username: leastMisses.username,
      avatarUrl: leastMisses.avatarUrl,
    },
  });
  const validRatings = players.filter((p) => p.ratingDelta !== null);
  if (validRatings.length > 0) {
    const biggestGain = validRatings.reduce((prev, curr) =>
      curr.ratingDelta! > prev.ratingDelta! ? curr : prev
    );

    highlights.push({
      id: 'biggest-gain',
      label: 'Biggest Gain',
      value: `${biggestGain.ratingDelta! > 0 ? '+' : ''}${biggestGain.ratingDelta!.toFixed(0)} TR`,
      sublabel: biggestGain.username,
      icon: 'TrendingUp',
      color: 'green',
      player: {
        id: biggestGain.playerId,
        username: biggestGain.username,
        avatarUrl: biggestGain.avatarUrl,
      },
    });
  }

  // Calculate average TR
  const playersWithRatings = players.filter((p) => p.ratingAfter !== null);
  if (playersWithRatings.length > 0) {
    const ratings = playersWithRatings.map((p) => p.ratingAfter!);
    const averageRating =
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

    const tierInfo = getTierFromRating(averageRating);

    highlights.push({
      id: 'average-tr',
      label: 'Average TR',
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
  if (score >= 1_000_000) {
    return `${(score / 1_000_000).toFixed(1)}M`;
  } else if (score >= 100_000) {
    return `${Math.floor(score / 1_000)}K`;
  } else if (score >= 10_000) {
    return `${(score / 1_000).toFixed(0)}K`;
  } else if (score >= 1_000) {
    return `${(score / 1_000).toFixed(1)}K`;
  }
  return Math.floor(score).toLocaleString();
}

export function getRatingChangeColor(delta: number | null): string {
  if (delta === null) return 'text-muted-foreground';

  const absDelta = Math.abs(delta);
  if (absDelta === 0) return 'text-yellow-500';

  if (delta > 0) {
    return delta > 10 ? 'text-green-600' : 'text-green-500';
  } else {
    return delta < -10 ? 'text-red-600' : 'text-red-500';
  }
}

export function getRatingChangeIntensity(
  delta: number | null
): 'low' | 'medium' | 'high' {
  if (delta === null) return 'low';

  const abs = Math.abs(delta);
  if (abs > 30) return 'high';
  if (abs > 15) return 'medium';
  return 'low';
}
