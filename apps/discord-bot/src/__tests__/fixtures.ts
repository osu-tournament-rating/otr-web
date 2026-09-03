import {
  Mods,
  RatingAdjustmentType,
  Ruleset,
  ScoreGrade,
  ScoringType,
  Team,
  TeamType,
  VerificationStatus,
} from '@otr/core/osu';

import type { BeatmapListResponse } from '@/lib/orpc/schema/beatmapList';
import type { BeatmapStatsResponse } from '@/lib/orpc/schema/beatmapStats';
import type { LeaderboardResponse } from '@/lib/orpc/schema/leaderboard';
import type { Game, GameScore } from '@/lib/orpc/schema/match';
import type { Player } from '@/lib/orpc/schema/player';
import type { PlayerBeatmapsResponse } from '@/lib/orpc/schema/playerBeatmaps';
import type { PlayerStats } from '@/lib/orpc/schema/playerStats';
import type {
  PlayerTournamentListItem,
  TournamentBeatmap,
  TournamentDetail,
  TournamentListItem,
  TournamentMatch,
  TournamentPlayerStats,
} from '@/lib/orpc/schema/tournament';

import type { Reply } from '../command';

export const siteUrl = 'https://otr.stagec.net';

/** Stands in for the application emojis the bot owns at runtime. */
export const fakeEmoji = (name: string) => `<:${name}:1>`;
export const ctx = { siteUrl, emoji: fakeEmoji };

export const customIds = (reply: Reply) =>
  (reply.components ?? []).flatMap((r) =>
    r.components.flatMap((c) => ('custom_id' in c ? [c.custom_id] : []))
  );

const day = (offset: number, hour = 0) =>
  new Date(
    Date.UTC(2025, 5, 1) + offset * 86_400_000 + hour * 3_600_000
  ).toISOString();

export const player = (
  id: number,
  username: string,
  country = 'US'
): Player => ({
  id,
  osuId: 8_000_000 + id,
  username,
  country,
  defaultRuleset: Ruleset.Osu,
  osuLastFetch: day(0),
  osuTrackLastFetch: null,
  osuTrackDataFetchStatus: 0,
  dataFetchStatus: 2,
});

const compact = ({ id, osuId, username, country, defaultRuleset }: Player) => ({
  id,
  osuId,
  username,
  country,
  defaultRuleset,
});

const names = ['Cytusine', 'Zylice', 'Aireu', 'Kanjiro', 'Rinna', 'Vanta'];
export const roster = names.map((name, i) =>
  player(10 + i, name, ['KR', 'US', 'DE', 'JP', 'FR', 'CA'][i])
);

const company = [...roster, player(16, 'Nifty'), player(17, 'Perci')];

const adjustments = (count: number, start: number) => {
  let rating = start;
  return Array.from({ length: count }, (_, i) => {
    const delta = i === 0 ? 0 : ((i * 37) % 60) - 22;
    const before = rating;
    rating += delta;
    return {
      playerId: 1,
      adjustmentType:
        i === 0 ? RatingAdjustmentType.Initial : RatingAdjustmentType.Match,
      timestamp: day(i * 9, [13, 14, 16, 18, 15, 22, 17, 14][i % 8]),
      ratingBefore: before,
      ratingAfter: rating,
      volatilityBefore: 200 - i,
      volatilityAfter: 199 - i,
      matchId: i === 0 ? null : 500 + i,
      ratingDelta: delta,
      volatilityDelta: -1,
      match:
        i === 0
          ? null
          : { id: 500 + i, name: `CO25: (A) vs (B)`, tournamentId: 512 },
      gamesWon: i === 0 ? null : 4,
      gamesLost: i === 0 ? null : 2,
      matchWon: i === 0 ? null : delta > 0,
    };
  });
};

export const playerStats = {
  playerInfo: compact(player(1, 'Stage')),
  ruleset: Ruleset.Osu,
  rating: {
    ruleset: Ruleset.Osu,
    rating: 1642.4,
    volatility: 120.5,
    percentile: 95.8,
    globalRank: 1234,
    countryRank: 56,
    player: compact(player(1, 'Stage')),
    tournamentsPlayed: 43,
    matchesPlayed: 212,
    winRate: 0.58,
    tierProgress: {
      currentTier: 'Diamond',
      currentSubTier: 2,
      nextTier: 'Diamond',
      nextSubTier: 1,
      ratingForNextTier: 1700,
      ratingForNextMajorTier: 1900,
      nextMajorTier: 'Master',
      subTierFillPercentage: 0.58,
      majorTierFillPercentage: 0.14,
    },
    adjustments: adjustments(24, 1500),
    isProvisional: false,
  },
  matchStats: {
    averageMatchCostAggregate: 1.02,
    highestRating: 1701,
    ratingGained: 312,
    gamesWon: 640,
    gamesLost: 512,
    gamesPlayed: 1152,
    matchesWon: 123,
    matchesLost: 89,
    matchesPlayed: 212,
    gameWinRate: 0.556,
    matchWinRate: 0.58,
    bestWinStreak: 9,
    matchAverageScoreAggregate: 612_000,
    matchAverageMissesAggregate: 3.1,
    matchAverageAccuracyAggregate: 97.4,
    averageGamesPlayedAggregate: 5.4,
    averagePlacingAggregate: 3.2,
    periodStart: day(-400),
    periodEnd: day(220),
  },
  modStats: [
    { mods: Mods.None, count: 400, averageScore: 600_000 },
    { mods: Mods.Hidden, count: 210, averageScore: 640_000 },
    { mods: Mods.Nightcore, count: 30, averageScore: 610_000 },
    { mods: Mods.DoubleTime, count: 20, averageScore: 605_000 },
    { mods: Mods.NoFail | Mods.Hidden, count: 10, averageScore: 590_000 },
    { mods: Mods.HardRock, count: 5, averageScore: 580_000 },
  ],
  frequentTeammates: company.slice(0, 6).map((p, i) => ({
    player: compact(p),
    frequency: 16 - i * 2,
  })),
  frequentOpponents: company.slice(2, 8).map((p, i) => ({
    player: compact(p),
    frequency: 12 - i,
  })),
  tournamentPerformanceStats: null,
} satisfies PlayerStats;

const listItem = (
  id: number,
  name: string,
  abbreviation: string,
  overrides: Partial<TournamentListItem> = {}
): TournamentListItem => ({
  id,
  created: day(-30),
  name,
  abbreviation,
  forumUrl: `https://osu.ppy.sh/community/forums/topics/${1_900_000 + id}`,
  rankRangeLowerBound: 1000,
  ruleset: Ruleset.Osu,
  lobbySize: 4,
  startTime: day(0),
  endTime: day(30),
  verificationStatus: VerificationStatus.Verified,
  rejectionReason: 0,
  isLazer: false,
  submittedByUsername: 'Stage',
  verifiedByUsername: 'Stage',
  adminNotes: [],
  ...overrides,
});

export const tournamentList = [
  listItem(512, 'Corsace Open 2025', 'CO25'),
  listItem(513, 'osu! World Cup 2024', 'OWC24', {
    rankRangeLowerBound: 1,
    startTime: day(-200),
    endTime: day(-150),
  }),
] satisfies TournamentListItem[];

export const playerTournaments = tournamentList.map(
  ({ adminNotes: _notes, ...item }, i) => ({
    ...item,
    matchesWon: 3 + i,
    matchesLost: 1,
  })
) satisfies PlayerTournamentListItem[];

const score = (gameId: number, p: Player, value: number): GameScore => ({
  id: gameId * 10 + p.id,
  rawScore: value,
  adjustedScore: null,
  scoreOverride: null,
  score: value,
  placement: 1,
  accuracy: 0.985,
  pp: null,
  maxCombo: 900,
  pass: true,
  isPerfectCombo: false,
  legacyPerfect: false,
  grade: ScoreGrade.S,
  mods: Mods.Hidden,
  statComboBreak: null,
  statGreat: 700,
  statOk: 20,
  statMeh: 1,
  statMiss: 2,
  statGood: null,
  statPerfect: null,
  statSliderTailHit: null,
  statLargeTickHit: null,
  statLargeTickMiss: null,
  statSmallTickHit: null,
  statSmallTickMiss: null,
  statLargeBonus: null,
  statSmallBonus: null,
  statIgnoreHit: null,
  statIgnoreMiss: null,
  statLegacyComboIncrease: null,
  legacyTotalScore: value,
  team: Team.Red,
  ruleset: Ruleset.Osu,
  verificationStatus: VerificationStatus.Verified,
  rejectionReason: 0,
  gameId,
  playerId: p.id,
  adminNotes: [],
});

const game = (matchId: number, index: number): Game => ({
  id: matchId * 10 + index,
  osuId: 700_000 + matchId * 10 + index,
  ruleset: Ruleset.Osu,
  scoringType: ScoringType.ScoreV2,
  teamType: TeamType.TeamVs,
  mods: Mods.None,
  startTime: day(index),
  endTime: day(index),
  verificationStatus: VerificationStatus.Verified,
  rejectionReason: 0,
  warningFlags: 0,
  matchId,
  beatmapId: 900 + index,
  isFreeMod: false,
  beatmap: null,
  adminNotes: [],
  scores: roster
    .slice(0, 2)
    .map((p, i) => score(matchId * 10 + index, p, 1_000_000 - i * 50_000)),
});

const match = (id: number, name: string, offset: number): TournamentMatch => ({
  id,
  osuId: 110_000_000 + id,
  name,
  startTime: day(offset),
  endTime: day(offset),
  verificationStatus: VerificationStatus.Verified,
  rejectionReason: 0,
  warningFlags: 0,
  isLazer: false,
  tournamentId: 512,
  submittedByUserId: null,
  verifiedByUserId: null,
  dataFetchStatus: 2,
  games: Array.from({ length: 9 }, (_, i) => game(id, i)),
  players: roster.map(compact).map((p) => ({ ...p, userId: null })),
  playerMatchStats: [],
  ratingAdjustments: [],
  adminNotes: [],
  tournament: null,
  winRecord: {
    matchId: id,
    isTied: false,
    loserPoints: 3,
    winnerPoints: 5,
    loserTeam: Team.Blue,
    winnerTeam: Team.Red,
  },
  rosters: [],
  verifiedByUsername: 'Stage',
});

const playerTournamentStat = (p: Player, i: number): TournamentPlayerStats => ({
  id: 3000 + p.id,
  averageRatingDelta: 4 - i,
  averageMatchCost: 1.42 - i * 0.05,
  averageScore: 600_000,
  averagePlacement: 2.1 + i * 0.3,
  averageAccuracy: 0.97,
  matchesPlayed: 10,
  matchesWon: 9 - i,
  matchesLost: 1 + i,
  gamesPlayed: 60,
  gamesWon: 40 - i,
  gamesLost: 20 + i,
  teammateIds: [],
  playerId: p.id,
  tournamentId: 512,
  matchWinRate: (9 - i) / 10,
  player: p,
  ratingBefore: 1600,
  ratingAfter: 1600 + 38 - i * 7,
});

const pooledBeatmap = (i: number): TournamentBeatmap => ({
  id: 900 + i,
  osuId: 658_100 + i,
  ruleset: Ruleset.Osu,
  rankedStatus: 1,
  diffName: ['Insane', 'Extra', 'Expert', 'FOUR DIMENSIONS'][i % 4],
  totalLength: 200 + i * 10,
  drainLength: 190 + i * 10,
  bpm: 180 + i * 5,
  countCircle: 400,
  countSlider: 300,
  countSpinner: 2,
  cs: 4,
  hp: 5,
  od: 9,
  ar: 9.5,
  sr: 5.2 + i * 0.2,
  maxCombo: 1200,
  beatmapsetId: 400 + i,
  dataFetchStatus: 2,
  manualOverride: false,
  titleOverride: null,
  artistOverride: null,
  setOwnerIdOverride: null,
  beatmapset: {
    id: 400 + i,
    osuId: 300_000 + i,
    creatorId: 10,
    artist: ['xi', 'Camellia', 'DragonForce', 'UNDEAD CORPORATION'][i % 4],
    title: [
      'Blue Zenith',
      'Exit This Earth',
      'Through the Fire',
      'Everything will freeze',
    ][i % 4],
    rankedStatus: 1,
    rankedDate: day(-800),
    submittedDate: day(-900),
    creator: roster[0],
  },
  attributes: [],
  creators: [roster[0]],
  topMods: [
    {
      mod: ['NM', 'HD', 'HR', 'DT'][i % 4],
      mods: [0, 8, 16, 64][i % 4],
      percentage: 61,
    },
  ],
});

export const tournamentDetail = {
  id: 512,
  name: 'Corsace Open 2025',
  abbreviation: 'CO25',
  forumUrl: 'https://osu.ppy.sh/community/forums/topics/1900512',
  rankRangeLowerBound: 1000,
  ruleset: Ruleset.Osu,
  lobbySize: 4,
  verificationStatus: VerificationStatus.Verified,
  rejectionReason: 0,
  isLazer: true,
  submittedByUserId: 1,
  verifiedByUserId: 1,
  startTime: day(0),
  endTime: day(30),
  matches: Array.from({ length: 12 }, (_, i) =>
    match(600 + i, `CO25: (Team ${i}) vs (Team ${i + 1})`, i * 2)
  ),
  adminNotes: [],
  playerTournamentStats: roster.map(playerTournamentStat),
  pooledBeatmaps: Array.from({ length: 11 }, (_, i) => pooledBeatmap(i)),
  submittedByUsername: 'Stage',
  verifiedByUsername: 'Stage',
} satisfies TournamentDetail;

const beatmapTournamentUsage = (id: number, name: string, offset: number) => ({
  tournament: { id, name },
  gameCount: 32,
  scoreCount: 256,
  rankRangeLowerBound: id === 513 ? 1 : 1000,
  lobbySize: id === 514 ? 3 : 4,
  startTime: day(offset),
  endTime: day(offset + 30),
  verificationStatus: VerificationStatus.Verified,
  rejectionReason: 0,
  mostCommonMods: Mods.None,
  mostCommonModsFreemod: false,
});

export const beatmapStats = {
  beatmap: {
    ...pooledBeatmap(3),
    id: 903,
    osuId: 658_127,
    sr: 7.04,
    bpm: 200,
    totalLength: 262,
    ar: 9.6,
    beatmapset: {
      id: 403,
      osuId: 292_301,
      creatorId: 10,
      artist: 'xi',
      title: 'Blue Zenith',
      rankedStatus: 1,
      rankedDate: day(-800),
      submittedDate: day(-900),
      creator: compact(player(10, 'Asphyxia')),
    },
    creators: [compact(player(10, 'Asphyxia'))],
    setOwnerOverride: null,
  },
  relatedDifficulties: [],
  summary: {
    totalGameCount: 384,
    totalTournamentCount: 12,
    verifiedTournamentCount: 10,
    totalPlayedGameCount: 400,
    pooledPlayedTournamentCount: 11,
  },
  usageOverTime: [],
  tournaments: [
    beatmapTournamentUsage(512, 'Corsace Open 2025', 0),
    beatmapTournamentUsage(513, 'osu! World Cup 2024', -200),
    beatmapTournamentUsage(514, '5 Digit World Cup', -400),
  ],
  modDistribution: [
    { mods: Mods.None, scoreCount: 1500, percentage: 78 },
    { mods: Mods.Hidden, scoreCount: 290, percentage: 15 },
    { mods: Mods.DoubleTime, scoreCount: 135, percentage: 7 },
    { mods: Mods.Flashlight, scoreCount: 4, percentage: 0.2 },
  ],
  topPerformers: roster.map((p, i) => ({
    player: compact(p),
    score: 1_214_905 - i * 27_000,
    grade: ScoreGrade.S,
    accuracy: (99.1 - i * 0.3) / 100,
    mods: i % 2 === 0 ? Mods.Hidden | Mods.HardRock : Mods.Hidden,
    playedAt: day(i),
    matchId: 600 + i,
    gameId: 6000 + i,
    scoreId: 60_000 + i,
    tournament: { id: 512, name: 'Corsace Open 2025' },
  })),
  scoreDistribution: [],
  scorePercentiles: Array.from({ length: 21 }, (_, i) => ({
    percentile: i * 5,
    score: Math.round(300_000 + 900_000 * Math.pow(i / 20, 1.6)),
  })),
  chartedScoreCount: 1925,
  scoreSample: { totalScoreCount: 1929, points: [] },
  performance: {
    scoreCount: 1929,
    missDataScoreCount: 1900,
    missDistribution: [],
    gradeDistribution: [],
  },
  freemodPicks: { freemodGameCount: 0, freemodScoreCount: 0, distribution: [] },
  rankRangeModDistribution: [],
  tierBreakdown: { ratedScoreCount: 1800, totalScoreCount: 1929, tiers: [] },
  closeness: {
    gameCount: 384,
    excludedUnverifiedGameCount: 16,
    cohort: null,
    reliability: null,
    percentile: null,
    percentileInterval: null,
    bins: [],
    baselineZDeciles: null,
    games: [],
  },
} satisfies BeatmapStatsResponse;

export const beatmapList = {
  items: [
    {
      id: 903,
      osuId: 658_127,
      artist: 'xi',
      title: 'Blue Zenith',
      diffName: 'FOUR DIMENSIONS',
      ruleset: Ruleset.Osu,
      sr: 7.04,
      bpm: 200,
      cs: 4,
      ar: 9.6,
      od: 9,
      hp: 5,
      totalLength: 262,
      beatmapsetOsuId: 292_301,
      creator: 'Asphyxia',
      verifiedTournamentCount: 10,
      verifiedGameCount: 384,
      topMods: [],
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 25,
  totalPages: 1,
} satisfies BeatmapListResponse;

export const playerBeatmaps = {
  totalCount: 7,
  beatmaps: Array.from({ length: 5 }, (_, i) => ({
    id: 900 + i,
    osuId: 658_100 + i,
    rankedStatus: 1,
    diffName: 'Extra',
    totalLength: 200,
    drainLength: 190,
    bpm: 200 + i,
    countCircle: 400,
    countSlider: 300,
    countSpinner: 2,
    cs: 4,
    hp: 5,
    od: 9,
    ar: 9.5,
    sr: 6.42 - i * 0.1,
    maxCombo: 1200,
    beatmapsetId: 300_000 + i,
    ruleset: Ruleset.Osu,
    artist: 'Camellia',
    title: `Exit This Earth ${i}`,
    tournamentCount: 3 + i,
    gameCount: 40,
  })),
} satisfies PlayerBeatmapsResponse;

export const leaderboard = {
  page: 3,
  pageSize: 20,
  pages: 515,
  total: 10_287,
  ruleset: Ruleset.Osu,
  leaderboard: Array.from({ length: 20 }, (_, i) => {
    const p = roster[i % roster.length];
    return {
      ruleset: Ruleset.Osu,
      rating: 1742 - i * 3,
      volatility: 110,
      percentile: 0.4 + i * 0.01,
      globalRank: 41 + i,
      countryRank: 1 + i,
      player: {
        id: p.id,
        osuId: p.osuId,
        username: p.username,
        country: p.country,
      },
      tournamentsPlayed: 30,
      matchesPlayed: 212 - i,
      winRate: 0.58,
      tier: 'diamond' as const,
      tierProgress: {
        currentTier: 'Diamond',
        currentSubTier: 1,
        nextTier: 'Master',
        nextSubTier: null,
        ratingForNextTier: 1900,
        ratingForNextMajorTier: 1900,
        nextMajorTier: 'Master',
        subTierFillPercentage: 0.4,
        majorTierFillPercentage: 0.8,
      },
    };
  }),
} satisfies LeaderboardResponse;
