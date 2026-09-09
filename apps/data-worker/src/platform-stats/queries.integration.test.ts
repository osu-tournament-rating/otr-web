import { afterAll, describe, expect, test } from 'bun:test';
import { and, eq, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { dbSchema } from '@otr/core/db';
import * as schema from '@otr/core/db/schema';
import {
  Mods,
  RatingAdjustmentType,
  Ruleset,
  ScoringType,
  Team,
  TeamType,
  VerificationStatus,
} from '@otr/core/osu';
import {
  PLAYER_STATS_FIRST_PLACE_MINIMUM,
  PLAYER_STATS_LIMITS,
  PLAYER_STATS_MILESTONES,
  PLAYER_STATS_TEAM_SIZES,
  PLAYER_STATS_UPSET_WINDOWS,
  PLAYER_STATS_WINDOWS,
} from '@otr/core/stats/player-stats';

import type { Logger } from '../logging/logger';
import { buildPlayerStats } from './build';
import {
  materialiseEligibleScores,
  selectActive,
  selectDuos,
  selectFirstPlace,
  selectLeaders,
  selectMilestones,
  selectModLeaders,
  selectNewcomers,
  selectParticipation,
  selectUpsets,
  type PlayerStatsTransaction,
} from './queries';
import { refreshPlayerStats } from './service';

const url = process.env.PLATFORM_STATS_TEST_DATABASE_URL;
if (
  url &&
  new URL(url).port !== '5434' &&
  !(process.env.GITHUB_ACTIONS === 'true' && new URL(url).port === '5432')
)
  throw new Error(
    'Platform stats integration tests require disposable PostgreSQL port 5434'
  );
const suite = url ? describe : describe.skip;

/**
 * No verified tournament uses ManiaOther, so each scenario's fixture is the entire eligible
 * source and every list can be asserted exactly. Scenarios roll back, so they never see each other.
 */
const RULESET = Ruleset.ManiaOther;
const NOW = new Date('2026-09-09T00:00:00.000Z');
const LEADERS = PLAYER_STATS_LIMITS.leaders;
const OSU_ID_FLOOR = 2_000_000_000;

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLogger,
};

let nextOsuId = OSU_ID_FLOOR + 1;
let fixtureCounter = 0;

const nextOsu = () => nextOsuId++;
const daysBefore = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000);
const iso = (date: Date) => date.toISOString();
const ids = (rows: { id: number }[]) => rows.map((row) => row.id);

interface ScoreSpec {
  playerId: number;
  score: number;
  team?: Team;
  mods?: number;
  verification?: VerificationStatus;
}

interface GameSpec {
  startTime?: Date;
  mods?: number;
  verification?: VerificationStatus;
  scores: ScoreSpec[];
}

suite('platform player statistics queries', () => {
  const pool = new Pool({ connectionString: url, max: 4 });
  const db = drizzle(pool, { schema: dbSchema });

  afterAll(async () => {
    // Scenarios roll back; this only clears fixture players a failed scenario left behind.
    await db
      .delete(schema.players)
      .where(gt(schema.players.osuId, OSU_ID_FLOOR));
    await pool.end();
  });

  class ScenarioComplete extends Error {}

  const scenario = async (
    run: (tx: PlayerStatsTransaction) => Promise<void>
  ) => {
    try {
      await db.transaction(async (tx) => {
        await run(tx);
        throw new ScenarioComplete();
      });
    } catch (error) {
      if (!(error instanceof ScenarioComplete)) {
        throw error;
      }
    }
  };

  const createPlayer = async (
    tx: PlayerStatsTransaction,
    options: {
      username: string;
      restricted?: boolean;
      rating?: number;
      globalRank?: number;
    }
  ): Promise<number> => {
    const [player] = await tx
      .insert(schema.players)
      .values({
        osuId: nextOsu(),
        username: options.username,
        country: 'US',
        osuRestricted: options.restricted ?? false,
      })
      .returning({ id: schema.players.id });

    if (options.rating !== undefined) {
      await tx.insert(schema.playerRatings).values({
        playerId: player.id,
        ruleset: RULESET,
        rating: options.rating,
        volatility: 100,
        percentile: 0.5,
        globalRank: 1,
        countryRank: 1,
      });
    }

    if (options.globalRank !== undefined) {
      await tx.insert(schema.playerOsuRulesetData).values({
        playerId: player.id,
        ruleset: RULESET,
        pp: 1000,
        globalRank: options.globalRank,
      });
    }

    return player.id;
  };

  const createTournament = async (
    tx: PlayerStatsTransaction,
    options: { lobbySize: number; verification?: VerificationStatus }
  ): Promise<number> => {
    const tag = `PS${++fixtureCounter}`;
    const [tournament] = await tx
      .insert(schema.tournaments)
      .values({
        name: `Player stats fixture ${tag}`,
        abbreviation: tag,
        forumUrl: `https://osu.ppy.sh/community/forums/topics/${nextOsu()}`,
        rankRangeLowerBound: 1,
        ruleset: RULESET,
        lobbySize: options.lobbySize,
        verificationStatus: options.verification ?? VerificationStatus.Verified,
      })
      .returning({ id: schema.tournaments.id });

    return tournament.id;
  };

  const createMatch = async (
    tx: PlayerStatsTransaction,
    options: {
      tournamentId: number;
      startTime: Date;
      verification?: VerificationStatus;
      games: GameSpec[];
    }
  ): Promise<number> => {
    const [match] = await tx
      .insert(schema.matches)
      .values({
        osuId: nextOsu(),
        name: `Player stats fixture match ${++fixtureCounter}`,
        startTime: iso(options.startTime),
        endTime: iso(options.startTime),
        tournamentId: options.tournamentId,
        verificationStatus: options.verification ?? VerificationStatus.Verified,
      })
      .returning({ id: schema.matches.id });

    for (const game of options.games) {
      const startTime = iso(game.startTime ?? options.startTime);
      const [row] = await tx
        .insert(schema.games)
        .values({
          osuId: nextOsu(),
          ruleset: RULESET,
          scoringType: ScoringType.ScoreV2,
          teamType: TeamType.TeamVs,
          mods: game.mods ?? Mods.None,
          startTime,
          endTime: startTime,
          matchId: match.id,
          verificationStatus: game.verification ?? VerificationStatus.Verified,
        })
        .returning({ id: schema.games.id });

      await tx.insert(schema.gameScores).values(
        game.scores.map((score) => ({
          gameId: row.id,
          playerId: score.playerId,
          rawScore: score.score,
          placement: 1,
          accuracy: 95,
          maxCombo: 100,
          pass: true,
          isPerfectCombo: false,
          legacyPerfect: false,
          grade: 3,
          mods: score.mods ?? Mods.None,
          legacyTotalScore: score.score,
          team: score.team ?? Team.Blue,
          ruleset: RULESET,
          verificationStatus: score.verification ?? VerificationStatus.Verified,
          rejectionReason: 0,
        }))
      );
    }

    return match.id;
  };

  const createAdjustment = async (
    tx: PlayerStatsTransaction,
    options: { playerId: number; matchId: number; ratingBefore: number }
  ) => {
    const [rating] = await tx
      .select({ id: schema.playerRatings.id })
      .from(schema.playerRatings)
      .where(
        and(
          eq(schema.playerRatings.playerId, options.playerId),
          eq(schema.playerRatings.ruleset, RULESET)
        )
      );

    await tx.insert(schema.ratingAdjustments).values({
      adjustmentType: RatingAdjustmentType.Match,
      ruleset: RULESET,
      timestamp: iso(NOW),
      ratingBefore: options.ratingBefore,
      ratingAfter: options.ratingBefore,
      volatilityBefore: 100,
      volatilityAfter: 100,
      playerRatingId: rating.id,
      playerId: options.playerId,
      matchId: options.matchId,
    });
  };

  test('leaders count distinct tournaments, matches, and games', async () => {
    await scenario(async (tx) => {
      const alpha = await createPlayer(tx, { username: 'ps-alpha' });
      const bravo = await createPlayer(tx, { username: 'ps-bravo' });
      const first = await createTournament(tx, { lobbySize: 2 });
      const second = await createTournament(tx, { lobbySize: 2 });
      const pair = [
        { playerId: alpha, score: 100 },
        { playerId: bravo, score: 90 },
      ];

      await createMatch(tx, {
        tournamentId: first,
        startTime: daysBefore(40),
        games: [{ scores: pair }, { scores: pair }],
      });
      await createMatch(tx, {
        tournamentId: first,
        startTime: daysBefore(39),
        games: [{ scores: pair }, { scores: pair }],
      });
      await createMatch(tx, {
        tournamentId: second,
        startTime: daysBefore(38),
        games: [
          { scores: [{ playerId: alpha, score: 100 }] },
          { scores: [{ playerId: alpha, score: 100 }] },
          { scores: [{ playerId: alpha, score: 100 }] },
        ],
      });

      await materialiseEligibleScores(tx, RULESET);

      const read = (dimension: 'tournaments' | 'matches' | 'games') =>
        selectLeaders(tx, { ruleset: RULESET, dimension, limit: LEADERS });

      expect(
        (await read('tournaments')).map((row) => [row.id, row.value])
      ).toEqual([
        [alpha, 2],
        [bravo, 1],
      ]);
      expect((await read('matches')).map((row) => [row.id, row.value])).toEqual(
        [
          [alpha, 3],
          [bravo, 2],
        ]
      );
      expect((await read('games')).map((row) => [row.id, row.value])).toEqual([
        [alpha, 7],
        [bravo, 4],
      ]);
    });
  });

  test('a rejected score, game, match, or tournament is excluded at every level', async () => {
    await scenario(async (tx) => {
      const kept = await createPlayer(tx, { username: 'ps-kept' });
      const scoreRejected = await createPlayer(tx, { username: 'ps-score' });
      const gameUnverified = await createPlayer(tx, { username: 'ps-game' });
      const matchUnverified = await createPlayer(tx, { username: 'ps-match' });
      const tournamentUnverified = await createPlayer(tx, {
        username: 'ps-tournament',
      });
      const rejectedChain = await createPlayer(tx, { username: 'ps-rejected' });

      const verified = await createTournament(tx, { lobbySize: 2 });
      await createMatch(tx, {
        tournamentId: verified,
        startTime: daysBefore(20),
        games: [
          {
            scores: [
              { playerId: kept, score: 100 },
              {
                playerId: scoreRejected,
                score: 100,
                verification: VerificationStatus.Rejected,
              },
            ],
          },
          {
            verification: VerificationStatus.PreVerified,
            scores: [{ playerId: gameUnverified, score: 100 }],
          },
        ],
      });
      await createMatch(tx, {
        tournamentId: verified,
        startTime: daysBefore(19),
        verification: VerificationStatus.PreVerified,
        games: [{ scores: [{ playerId: matchUnverified, score: 100 }] }],
      });

      const pending = await createTournament(tx, {
        lobbySize: 2,
        verification: VerificationStatus.PreVerified,
      });
      await createMatch(tx, {
        tournamentId: pending,
        startTime: daysBefore(18),
        games: [{ scores: [{ playerId: tournamentUnverified, score: 100 }] }],
      });

      const rejected = await createTournament(tx, {
        lobbySize: 2,
        verification: VerificationStatus.Rejected,
      });
      await createMatch(tx, {
        tournamentId: rejected,
        startTime: daysBefore(17),
        verification: VerificationStatus.Rejected,
        games: [
          {
            verification: VerificationStatus.Rejected,
            scores: [
              {
                playerId: rejectedChain,
                score: 100,
                verification: VerificationStatus.Rejected,
              },
            ],
          },
        ],
      });

      await materialiseEligibleScores(tx, RULESET);

      const leaders = await selectLeaders(tx, {
        ruleset: RULESET,
        dimension: 'games',
        limit: LEADERS,
      });

      expect(leaders.map((row) => [row.id, row.value])).toEqual([[kept, 1]]);
    });
  });

  test('a restricted player leaves the named lists but still counts in participation', async () => {
    await scenario(async (tx) => {
      const visible = await createPlayer(tx, { username: 'ps-visible' });
      const restricted = await createPlayer(tx, {
        username: 'ps-restricted',
        restricted: true,
      });
      const tournament = await createTournament(tx, { lobbySize: 2 });

      await createMatch(tx, {
        tournamentId: tournament,
        startTime: new Date('2026-04-15T00:00:00.000Z'),
        games: [
          {
            scores: [
              { playerId: visible, score: 100 },
              { playerId: restricted, score: 900, team: Team.Red },
            ],
          },
        ],
      });

      await materialiseEligibleScores(tx, RULESET);

      const leaders = await selectLeaders(tx, {
        ruleset: RULESET,
        dimension: 'games',
        limit: LEADERS,
      });
      const participation = await selectParticipation(tx, { now: NOW });

      expect(ids(leaders)).toEqual([visible]);
      expect(participation).toContainEqual({ month: '2026-04', players: 2 });
    });
  });

  test('mod counts combine game and score mods and treat nightcore as doubletime', async () => {
    await scenario(async (tx) => {
      const alpha = await createPlayer(tx, { username: 'ps-mod-alpha' });
      const bravo = await createPlayer(tx, { username: 'ps-mod-bravo' });
      const charlie = await createPlayer(tx, { username: 'ps-mod-charlie' });
      const tournament = await createTournament(tx, { lobbySize: 2 });

      await createMatch(tx, {
        tournamentId: tournament,
        startTime: daysBefore(10),
        games: [
          { scores: [{ playerId: alpha, score: 100, mods: Mods.Hidden }] },
          { mods: Mods.HardRock, scores: [{ playerId: bravo, score: 100 }] },
          { mods: Mods.Nightcore, scores: [{ playerId: alpha, score: 100 }] },
          { scores: [{ playerId: alpha, score: 100, mods: Mods.DoubleTime }] },
          { scores: [{ playerId: charlie, score: 100, mods: Mods.Easy }] },
        ],
      });

      await materialiseEligibleScores(tx, RULESET);

      const mods = await selectModLeaders(tx, {
        ruleset: RULESET,
        mods: [Mods.Easy, Mods.HardRock, Mods.Hidden, Mods.DoubleTime],
        limit: LEADERS,
      });

      expect(
        mods.map((entry) => [
          entry.mods,
          entry.leaders.map((leader) => [leader.id, leader.value]),
        ])
      ).toEqual([
        [Mods.Easy, [[charlie, 1]]],
        [Mods.HardRock, [[bravo, 1]]],
        [Mods.Hidden, [[alpha, 1]]],
        [Mods.DoubleTime, [[alpha, 2]]],
      ]);
    });
  });

  test('duos count shared games, matches, and tournaments and exclude cross-team pairs', async () => {
    await scenario(async (tx) => {
      const alpha = await createPlayer(tx, { username: 'ps-duo-alpha' });
      const bravo = await createPlayer(tx, { username: 'ps-duo-bravo' });
      const charlie = await createPlayer(tx, { username: 'ps-duo-charlie' });
      const delta = await createPlayer(tx, { username: 'ps-duo-delta' });
      const first = await createTournament(tx, { lobbySize: 2 });
      const second = await createTournament(tx, { lobbySize: 2 });
      const roster = [
        { playerId: alpha, score: 100, team: Team.Blue },
        { playerId: bravo, score: 90, team: Team.Blue },
        { playerId: charlie, score: 80, team: Team.Red },
        { playerId: delta, score: 70, team: Team.Red },
      ];
      const firstGame = daysBefore(50);
      const lastGame = daysBefore(30);

      await createMatch(tx, {
        tournamentId: first,
        startTime: firstGame,
        games: [
          { startTime: firstGame, scores: roster },
          { startTime: daysBefore(49), scores: roster },
        ],
      });
      await createMatch(tx, {
        tournamentId: second,
        startTime: lastGame,
        games: [{ startTime: lastGame, scores: roster }],
      });

      await materialiseEligibleScores(tx, RULESET);

      const duos = await selectDuos(tx, {
        ruleset: RULESET,
        limit: PLAYER_STATS_LIMITS.duos,
      });

      expect(
        duos.map((duo) => [
          duo.players.map((player) => player.id),
          duo.games,
          duo.matches,
          duo.tournaments,
          duo.firstGame,
          duo.lastGame,
        ])
      ).toEqual([
        [[alpha, bravo], 3, 2, 2, iso(firstGame), iso(lastGame)],
        [[charlie, delta], 3, 2, 2, iso(firstGame), iso(lastGame)],
      ]);
    });
  });

  test('first place rate uses the highest verified score and applies thresholds per cohort', async () => {
    await scenario(async (tx) => {
      const winner = await createPlayer(tx, { username: 'ps-fp-winner' });
      const runnerUp = await createPlayer(tx, { username: 'ps-fp-runner' });
      const splitter = await createPlayer(tx, { username: 'ps-fp-splitter' });
      const shortGames = await createPlayer(tx, { username: 'ps-fp-short' });
      const fewMatches = await createPlayer(tx, { username: 'ps-fp-few' });

      const duels = await createTournament(tx, { lobbySize: 2 });
      for (let index = 0; index < 10; index += 1) {
        const roster = [
          { playerId: winner, score: 1000, team: Team.Blue },
          { playerId: runnerUp, score: 500, team: Team.Red },
          ...(index < 5
            ? [{ playerId: splitter, score: 400, team: Team.Blue }]
            : []),
        ];
        await createMatch(tx, {
          tournamentId: duels,
          startTime: daysBefore(100 - index),
          games: [0, 1, 2, 3].map((game) => ({
            scores:
              index === 9 && game === 3
                ? roster.map((score) =>
                    score.playerId === runnerUp
                      ? { ...score, score: 1000 }
                      : score
                  )
                : roster,
          })),
        });
      }

      const squads = await createTournament(tx, { lobbySize: 4 });
      for (let index = 0; index < 10; index += 1) {
        const roster = [
          { playerId: shortGames, score: 1000, team: Team.Blue },
          ...(index < 5
            ? [{ playerId: splitter, score: 400, team: Team.Blue }]
            : []),
        ];
        await createMatch(tx, {
          tournamentId: squads,
          startTime: daysBefore(80 - index),
          games: [0, 1, 2].map(() => ({ scores: roster })),
        });
      }

      const shortSeason = await createTournament(tx, { lobbySize: 2 });
      for (let index = 0; index < 9; index += 1) {
        await createMatch(tx, {
          tournamentId: shortSeason,
          startTime: daysBefore(60 - index),
          games: [0, 1, 2, 3].map(() => ({
            scores: [{ playerId: fewMatches, score: 1000 }],
          })),
        });
      }

      await materialiseEligibleScores(tx, RULESET);

      const firstPlace = await selectFirstPlace(tx, {
        ruleset: RULESET,
        teamSizes: PLAYER_STATS_TEAM_SIZES,
        minimum: PLAYER_STATS_FIRST_PLACE_MINIMUM,
        limit: PLAYER_STATS_LIMITS.firstPlace,
      });

      expect(
        firstPlace.all?.map((row) => [row.id, row.wins, row.games])
      ).toEqual([
        [winner, 40, 40],
        [runnerUp, 1, 40],
        [splitter, 0, 35],
      ]);
      expect(ids(firstPlace['2'] ?? [])).toEqual([winner, runnerUp]);
      expect(firstPlace['4']).toEqual([]);
      expect(firstPlace['1']).toEqual([]);
      expect(firstPlace['3']).toEqual([]);
    });
  }, 120_000);

  test('upsets need a lower-rated winner of a two-player match and respect the windows', async () => {
    await scenario(async (tx) => {
      const challenger = await createPlayer(tx, {
        username: 'ps-challenger',
        rating: 1000,
      });
      const favourite = await createPlayer(tx, {
        username: 'ps-favourite',
        rating: 1500,
      });
      const third = await createPlayer(tx, {
        username: 'ps-third',
        rating: 1200,
      });
      const tournament = await createTournament(tx, { lobbySize: 1 });
      const oldDate = new Date('2026-01-15T00:00:00.000Z');
      const recentDate = daysBefore(20);

      const duel = (
        startTime: Date,
        results: { winner: number; loser: number }[]
      ) =>
        createMatch(tx, {
          tournamentId: tournament,
          startTime,
          games: results.map((result) => ({
            scores: [
              { playerId: result.winner, score: 1000, team: Team.Blue },
              { playerId: result.loser, score: 500, team: Team.Red },
            ],
          })),
        });

      const upsetOld = await duel(oldDate, [
        { winner: challenger, loser: favourite },
        { winner: challenger, loser: favourite },
        { winner: favourite, loser: challenger },
      ]);
      await createAdjustment(tx, {
        playerId: challenger,
        matchId: upsetOld,
        ratingBefore: 1000,
      });
      await createAdjustment(tx, {
        playerId: favourite,
        matchId: upsetOld,
        ratingBefore: 1500,
      });

      const upsetRecent = await duel(recentDate, [
        { winner: challenger, loser: favourite },
      ]);
      await createAdjustment(tx, {
        playerId: challenger,
        matchId: upsetRecent,
        ratingBefore: 1400,
      });
      await createAdjustment(tx, {
        playerId: favourite,
        matchId: upsetRecent,
        ratingBefore: 1500,
      });

      const favouriteWon = await duel(recentDate, [
        { winner: favourite, loser: challenger },
      ]);
      await createAdjustment(tx, {
        playerId: challenger,
        matchId: favouriteWon,
        ratingBefore: 1000,
      });
      await createAdjustment(tx, {
        playerId: favourite,
        matchId: favouriteWon,
        ratingBefore: 1500,
      });

      const drawn = await duel(recentDate, [
        { winner: challenger, loser: favourite },
        { winner: favourite, loser: challenger },
      ]);
      await createAdjustment(tx, {
        playerId: challenger,
        matchId: drawn,
        ratingBefore: 1000,
      });
      await createAdjustment(tx, {
        playerId: favourite,
        matchId: drawn,
        ratingBefore: 1500,
      });

      const crowded = await createMatch(tx, {
        tournamentId: tournament,
        startTime: recentDate,
        games: [
          {
            scores: [
              { playerId: challenger, score: 1000, team: Team.Blue },
              { playerId: favourite, score: 500, team: Team.Red },
              { playerId: third, score: 400, team: Team.Red },
            ],
          },
        ],
      });
      await createAdjustment(tx, {
        playerId: challenger,
        matchId: crowded,
        ratingBefore: 1000,
      });
      await createAdjustment(tx, {
        playerId: favourite,
        matchId: crowded,
        ratingBefore: 1500,
      });

      const unrated = await duel(recentDate, [
        { winner: challenger, loser: favourite },
      ]);

      await materialiseEligibleScores(tx, RULESET);

      const upsets = await selectUpsets(tx, {
        ruleset: RULESET,
        now: NOW,
        windows: PLAYER_STATS_UPSET_WINDOWS,
        limit: PLAYER_STATS_LIMITS.upsets,
      });

      expect(
        upsets.all?.map((upset) => [
          upset.matchId,
          upset.winner.id,
          upset.winner.ratingBefore,
          upset.loser.id,
          upset.loser.ratingBefore,
          upset.gap,
          upset.date,
        ])
      ).toEqual([
        [upsetOld, challenger, 1000, favourite, 1500, 500, iso(oldDate)],
        [upsetRecent, challenger, 1400, favourite, 1500, 100, iso(recentDate)],
      ]);
      expect(upsets.all?.[0]?.tournament.id).toBe(tournament);
      expect(upsets.all?.map((upset) => upset.matchId)).not.toContain(
        favouriteWon
      );
      expect(upsets.all?.map((upset) => upset.matchId)).not.toContain(drawn);
      expect(upsets.all?.map((upset) => upset.matchId)).not.toContain(crowded);
      expect(upsets.all?.map((upset) => upset.matchId)).not.toContain(unrated);

      expect(upsets['12']?.map((upset) => upset.matchId)).toEqual([
        upsetOld,
        upsetRecent,
      ]);
      expect(upsets['6']?.map((upset) => upset.matchId)).toEqual([upsetRecent]);
      expect(upsets['3']?.map((upset) => upset.matchId)).toEqual([upsetRecent]);
    });
  });

  test('active players are ranked over the recent-months window', async () => {
    await scenario(async (tx) => {
      const busy = await createPlayer(tx, { username: 'ps-busy' });
      const dormant = await createPlayer(tx, { username: 'ps-dormant' });
      const first = await createTournament(tx, { lobbySize: 2 });
      const second = await createTournament(tx, { lobbySize: 2 });

      for (const [tournamentId, days] of [
        [first, 10],
        [first, 40],
        [second, 70],
      ] as const) {
        await createMatch(tx, {
          tournamentId,
          startTime: daysBefore(days),
          games: [{ scores: [{ playerId: busy, score: 100 }] }],
        });
      }

      await createMatch(tx, {
        tournamentId: first,
        startTime: new Date('2026-01-05T00:00:00.000Z'),
        games: [{ scores: [{ playerId: dormant, score: 100 }] }],
      });

      await materialiseEligibleScores(tx, RULESET);

      const active = await selectActive(tx, {
        ruleset: RULESET,
        now: NOW,
        months: PLAYER_STATS_WINDOWS.activeMonths,
        limit: PLAYER_STATS_LIMITS.active,
      });

      expect(
        active.map((row) => [row.id, row.matches, row.tournaments])
      ).toEqual([[busy, 3, 2]]);
    });
  });

  test('milestones fire at the nth item inside the recent window and nowhere else', async () => {
    await scenario(async (tx) => {
      const [milestone] = PLAYER_STATS_MILESTONES;
      const reaching = await createPlayer(tx, { username: 'ps-milestone' });
      const short = await createPlayer(tx, { username: 'ps-milestone-short' });
      const late = await createPlayer(tx, { username: 'ps-milestone-late' });
      let reachedAt = new Date();
      let reachedMatch = 0;

      for (let index = 0; index < milestone; index += 1) {
        const startTime =
          index === milestone - 1
            ? daysBefore(5)
            : new Date(
                `2026-06-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`
              );
        const tournamentId = await createTournament(tx, { lobbySize: 2 });
        const matchId = await createMatch(tx, {
          tournamentId,
          startTime,
          games: [{ scores: [{ playerId: reaching, score: 100 }] }],
        });

        if (index === milestone - 1) {
          reachedAt = startTime;
          reachedMatch = matchId;
        }
      }

      for (let index = 0; index < milestone - 1; index += 1) {
        const tournamentId = await createTournament(tx, { lobbySize: 2 });
        await createMatch(tx, {
          tournamentId,
          startTime: daysBefore(6),
          games: [{ scores: [{ playerId: short, score: 100 }] }],
        });
      }

      const lateTournament = await createTournament(tx, { lobbySize: 2 });
      for (let index = 0; index < milestone + 2; index += 1) {
        await createMatch(tx, {
          tournamentId: lateTournament,
          startTime: index < milestone ? daysBefore(40) : daysBefore(3),
          games: [{ scores: [{ playerId: late, score: 100 }] }],
        });
      }

      await materialiseEligibleScores(tx, RULESET);

      const milestones = await selectMilestones(tx, {
        ruleset: RULESET,
        now: NOW,
        recentDays: PLAYER_STATS_WINDOWS.recentDays,
        milestones: PLAYER_STATS_MILESTONES,
        limit: PLAYER_STATS_LIMITS.milestones,
      });

      expect(
        milestones.map((row) => [
          row.id,
          row.kind,
          row.count,
          row.date,
          row.matchId,
        ])
      ).toEqual([
        [reaching, 'games', milestone, iso(reachedAt), reachedMatch],
        [reaching, 'matches', milestone, iso(reachedAt), reachedMatch],
        [reaching, 'tournaments', milestone, iso(reachedAt), reachedMatch],
      ]);
      expect(ids(milestones)).not.toContain(short);
      expect(ids(milestones)).not.toContain(late);
    });
  }, 120_000);

  test('newcomers debut inside the recent window and carry a win-loss record', async () => {
    await scenario(async (tx) => {
      const rookie = await createPlayer(tx, {
        username: 'ps-rookie',
        globalRank: 4321,
      });
      const unranked = await createPlayer(tx, { username: 'ps-unranked' });
      const veteran = await createPlayer(tx, { username: 'ps-veteran' });
      const foil = await createPlayer(tx, { username: 'ps-foil' });
      const tournament = await createTournament(tx, { lobbySize: 2 });

      await createMatch(tx, {
        tournamentId: tournament,
        startTime: new Date('2026-02-01T00:00:00.000Z'),
        games: [
          {
            scores: [
              { playerId: veteran, score: 500, team: Team.Blue },
              { playerId: foil, score: 400, team: Team.Red },
            ],
          },
        ],
      });

      const debut = daysBefore(5);
      const duel = (
        startTime: Date,
        playerId: number,
        own: number,
        other: number
      ) =>
        createMatch(tx, {
          tournamentId: tournament,
          startTime,
          games: [
            {
              scores: [
                { playerId, score: own, team: Team.Blue },
                { playerId: foil, score: other, team: Team.Red },
              ],
            },
          ],
        });

      const firstMatch = await duel(debut, rookie, 1000, 500);
      await duel(daysBefore(4), rookie, 1000, 500);
      await duel(daysBefore(4), rookie, 100, 900);
      await duel(daysBefore(3), rookie, 500, 500);
      const unrankedDebut = daysBefore(3);
      const unrankedMatch = await duel(unrankedDebut, unranked, 900, 100);

      await materialiseEligibleScores(tx, RULESET);

      const newcomers = await selectNewcomers(tx, {
        ruleset: RULESET,
        now: NOW,
        recentDays: PLAYER_STATS_WINDOWS.recentDays,
        limit: PLAYER_STATS_LIMITS.newcomers,
      });

      expect(
        newcomers.map((row) => [
          row.id,
          row.firstMatch,
          row.matchId,
          row.wins,
          row.losses,
          row.osuGlobalRank,
        ])
      ).toEqual([
        [unranked, iso(unrankedDebut), unrankedMatch, 1, 0, null],
        [rookie, iso(debut), firstMatch, 2, 1, 4321],
      ]);
    });
  });

  test('participation zero-fills months without an eligible match', async () => {
    await scenario(async (tx) => {
      const alpha = await createPlayer(tx, { username: 'ps-part-alpha' });
      const bravo = await createPlayer(tx, { username: 'ps-part-bravo' });
      const tournament = await createTournament(tx, { lobbySize: 2 });

      await createMatch(tx, {
        tournamentId: tournament,
        startTime: new Date('2026-01-10T00:00:00.000Z'),
        games: [
          {
            scores: [
              { playerId: alpha, score: 100 },
              { playerId: bravo, score: 90, team: Team.Red },
            ],
          },
        ],
      });
      await createMatch(tx, {
        tournamentId: tournament,
        startTime: new Date('2026-04-15T00:00:00.000Z'),
        games: [{ scores: [{ playerId: alpha, score: 100 }] }],
      });

      await materialiseEligibleScores(tx, RULESET);

      expect(await selectParticipation(tx, { now: NOW })).toEqual([
        { month: '2026-01', players: 2 },
        { month: '2026-02', players: 0 },
        { month: '2026-03', players: 0 },
        { month: '2026-04', players: 1 },
        { month: '2026-05', players: 0 },
        { month: '2026-06', players: 0 },
        { month: '2026-07', players: 0 },
        { month: '2026-08', players: 0 },
        { month: '2026-09', players: 0 },
      ]);
    });
  });

  test('buildPlayerStats assembles a payload that satisfies the contract', async () => {
    await scenario(async (tx) => {
      const alpha = await createPlayer(tx, { username: 'ps-build-alpha' });
      const bravo = await createPlayer(tx, { username: 'ps-build-bravo' });
      const tournament = await createTournament(tx, { lobbySize: 2 });

      await createMatch(tx, {
        tournamentId: tournament,
        startTime: daysBefore(7),
        games: [
          {
            scores: [
              { playerId: alpha, score: 100 },
              { playerId: bravo, score: 90, team: Team.Red },
            ],
          },
        ],
      });

      const payload = await buildPlayerStats(tx, RULESET, NOW);

      expect(ids(payload.leaders.games)).toEqual([alpha, bravo]);
      expect(payload.mods).toEqual([]);
      expect(payload.participation.at(-1)?.month).toBe('2026-09');
      expect(Object.keys(payload.upsets).sort()).toEqual(
        [...PLAYER_STATS_UPSET_WINDOWS].sort()
      );
      expect(Object.keys(payload.firstPlace).sort()).toEqual(
        [...PLAYER_STATS_TEAM_SIZES].sort()
      );
    });
  });
});

const snapshotTable = await (async () => {
  if (!url) {
    return false;
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const { rows } = await pool.query<{ present: boolean }>(
      "select to_regclass('platform_player_stats') is not null as present"
    );
    return rows[0]?.present ?? false;
  } finally {
    await pool.end();
  }
})();

const refreshSuite = url && snapshotTable ? describe : describe.skip;

if (url && !snapshotTable) {
  console.warn(
    'Skipping platform_player_stats refresh tests: the table does not exist yet on this database'
  );
}

refreshSuite('platform player statistics refresh', () => {
  const pool = new Pool({ connectionString: url, max: 2 });
  const db = drizzle(pool, { schema: dbSchema });
  const first = new Date('2026-09-09T00:00:00.000Z');
  const later = new Date('2026-09-09T01:00:00.000Z');

  const storedRows = () =>
    db
      .select({
        generatedAt: schema.platformPlayerStats.generatedAt,
        sourceKey: schema.platformPlayerStats.sourceKey,
      })
      .from(schema.platformPlayerStats)
      .where(eq(schema.platformPlayerStats.ruleset, RULESET));

  afterAll(async () => {
    await db
      .delete(schema.platformPlayerStats)
      .where(eq(schema.platformPlayerStats.ruleset, RULESET));
    await pool.end();
  });

  test('rebuilds once, skips an unchanged source key, and replaces the row on force', async () => {
    await db
      .delete(schema.platformPlayerStats)
      .where(eq(schema.platformPlayerStats.ruleset, RULESET));

    const initial = await refreshPlayerStats({
      db,
      ruleset: RULESET,
      now: first,
      logger: noopLogger,
    });
    expect(initial.rebuilt).toBe(true);

    const stored = await storedRows();
    expect(stored).toHaveLength(1);
    expect(new Date(stored[0]!.generatedAt).toISOString()).toBe(
      first.toISOString()
    );

    expect(
      (
        await refreshPlayerStats({
          db,
          ruleset: RULESET,
          now: later,
          logger: noopLogger,
        })
      ).rebuilt
    ).toBe(false);

    const forced = await refreshPlayerStats({
      db,
      ruleset: RULESET,
      now: later,
      force: true,
      logger: noopLogger,
    });
    expect(forced.rebuilt).toBe(true);

    const replaced = await storedRows();
    expect(replaced).toHaveLength(1);
    expect(new Date(replaced[0]!.generatedAt).toISOString()).toBe(
      later.toISOString()
    );
    expect(replaced[0]?.sourceKey).toBe(stored[0]!.sourceKey);
  }, 120_000);
});
