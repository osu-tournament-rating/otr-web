import {
  MatchDetail,
  MatchPlayer,
  PlayerMatchStats,
  RatingAdjustment,
} from '@/lib/orpc/schema/match';
import { Team, VerificationStatus } from '@otr/core/osu';
import { TierName, getTierFromRating } from '@/lib/utils/tierData';
import { formatAccuracy } from '@/lib/utils/format';

export interface HighlightPlayer {
  id: number;
  osuId: number;
  username: string;
}

export interface HighlightTierIcon {
  tier: TierName;
  subTier: number | undefined;
}

export type HighlightIcon =
  | 'Swords'
  | 'Users'
  | 'Gamepad2'
  | 'TrendingUp'
  | 'Medal'
  | 'Crosshair';

export interface HighlightStat {
  id: string;
  label: string;
  value: string;
  sublabel?: string;
  icon: HighlightIcon;
  player?: HighlightPlayer;
  tierIcon?: HighlightTierIcon;
  metric?: string;
  helpText?: string;
}

export type TeamColor = 'red' | 'blue';

export interface ProcessedPlayerStats {
  playerId: number;
  username: string;
  osuId: number;
  team?: TeamColor;
  won: boolean;
  gamesWon: number;
  gamesLost: number;
  gamesPlayed: number;
  matchCost: number;
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

const PRECISION = {
  ACCURACY_DECIMAL: 2,
} as const;

function getRosterTeamMap(match: MatchDetail): Map<number, TeamColor> {
  const playerTeams = new Map<number, TeamColor>();

  for (const roster of match.rosters ?? []) {
    const team =
      roster.team === Team.Red
        ? 'red'
        : roster.team === Team.Blue
          ? 'blue'
          : undefined;

    if (!team) continue;

    for (const playerId of roster.roster) {
      playerTeams.set(playerId, team);
    }
  }

  return playerTeams;
}

export function processMatchStatistics(
  match: MatchDetail,
  players: MatchPlayer[]
): ProcessedPlayerStats[] {
  if (!match.playerMatchStats?.length) {
    return [];
  }

  const playerMap = new Map(players.map((player) => [player.id, player]));
  const playerTeamMap = getRosterTeamMap(match);
  const ratingAdjustmentMap = new Map<number, RatingAdjustment>();

  for (const adjustment of match.ratingAdjustments ?? []) {
    if (!ratingAdjustmentMap.has(adjustment.playerId)) {
      ratingAdjustmentMap.set(adjustment.playerId, adjustment);
    }
  }

  return match.playerMatchStats.flatMap(
    (playerStats: PlayerMatchStats): ProcessedPlayerStats[] => {
      const playerInfo = playerMap.get(playerStats.playerId);
      const ratingAdjustment = ratingAdjustmentMap.get(playerStats.playerId);

      if (!playerInfo) return [];

      return [
        {
          playerId: playerStats.playerId,
          username: playerInfo.username,
          osuId: playerInfo.osuId,
          team: playerTeamMap.get(playerStats.playerId),
          won: Boolean(
            match.winRecord &&
            !match.winRecord.isTied &&
            match.winRecord.winnerRoster?.includes(playerStats.playerId)
          ),
          gamesWon: playerStats.gamesWon,
          gamesLost: playerStats.gamesLost,
          gamesPlayed: playerStats.gamesPlayed,
          matchCost: playerStats.matchCost,
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
        },
      ];
    }
  );
}

function createHighlightPlayer(player: ProcessedPlayerStats): HighlightPlayer {
  return {
    id: player.playerId,
    osuId: player.osuId,
    username: player.username,
  };
}

function createResultStat(
  match: MatchDetail,
  players: ProcessedPlayerStats[]
): HighlightStat {
  const winRecord = match.winRecord;

  if (winRecord) {
    const teamScores = new Map<Team, number>();

    if (winRecord.winnerTeam !== null) {
      teamScores.set(winRecord.winnerTeam, winRecord.winnerPoints);
    }
    if (winRecord.loserTeam !== null) {
      teamScores.set(winRecord.loserTeam, winRecord.loserPoints);
    }

    const redScore = teamScores.get(Team.Red);
    const blueScore = teamScores.get(Team.Blue);
    const winner = players.find((player) =>
      winRecord.winnerRoster?.includes(player.playerId)
    );

    return {
      id: 'match-result',
      label: 'Match Result',
      value:
        redScore !== undefined && blueScore !== undefined
          ? `${redScore} – ${blueScore}`
          : `${winRecord.winnerPoints} – ${winRecord.loserPoints}`,
      sublabel: winRecord.isTied
        ? 'Draw'
        : winRecord.winnerTeam === Team.Red
          ? 'Red wins'
          : winRecord.winnerTeam === Team.Blue
            ? 'Blue wins'
            : winner
              ? `${winner.username} wins`
              : 'Final score',
      icon: 'Swords',
      helpText: winRecord.isTied
        ? 'A draw can result when games are rejected during verification.'
        : undefined,
    };
  }

  return {
    id: 'match-result',
    label: 'Match Result',
    value: '—',
    sublabel: 'Result unavailable',
    icon: 'Swords',
  };
}

export function calculateHighlightStats(
  players: ProcessedPlayerStats[],
  match: MatchDetail
): HighlightStat[] {
  if (players.length === 0) {
    return [];
  }

  const ratedGames = (match.games ?? []).filter(
    (game) => game.verificationStatus === VerificationStatus.Verified
  ).length;
  const playersWithRatings = players.filter(
    (player): player is ProcessedPlayerStats & { ratingAfter: number } =>
      player.ratingAfter !== null
  );
  const averageRating = playersWithRatings.length
    ? playersWithRatings.reduce(
        (total, player) => total + player.ratingAfter,
        0
      ) / playersWithRatings.length
    : null;
  const averageTier =
    averageRating === null ? null : getTierFromRating(averageRating);
  const topMatchCost = players.reduce((previous, current) =>
    current.matchCost > previous.matchCost ? current : previous
  );
  const topAccuracy = players.reduce((previous, current) =>
    current.averageAccuracy > previous.averageAccuracy ? current : previous
  );

  return [
    createResultStat(match, players),
    {
      id: 'players',
      label: 'Players',
      value: players.length.toLocaleString(),
      sublabel: players.length === 1 ? 'Participant' : 'Participants',
      icon: 'Users',
    },
    {
      id: 'rated-games',
      label: 'Rated Games',
      value: ratedGames.toLocaleString(),
      sublabel: ratedGames === 1 ? 'Verified game' : 'Verified games',
      icon: 'Gamepad2',
      helpText: 'Only verified games contribute to match statistics.',
    },
    {
      id: 'average-rating',
      label: 'Average Rating',
      value:
        averageRating === null ? '—' : Math.round(averageRating).toString(),
      sublabel: averageRating === null ? 'Ratings unavailable' : undefined,
      icon: 'TrendingUp',
      metric: averageRating === null ? undefined : 'TR',
      tierIcon: averageTier
        ? { tier: averageTier.tier, subTier: averageTier.subTier }
        : undefined,
    },
    {
      id: 'match-cost',
      label: 'Top Match Cost',
      value: topMatchCost.matchCost.toFixed(2),
      icon: 'Medal',
      player: createHighlightPlayer(topMatchCost),
    },
    {
      id: 'accuracy',
      label: 'Top Accuracy',
      value: formatAccuracy(
        topAccuracy.averageAccuracy,
        PRECISION.ACCURACY_DECIMAL
      ),
      icon: 'Crosshair',
      metric: 'avg',
      player: createHighlightPlayer(topAccuracy),
    },
  ];
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
