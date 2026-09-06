import { expect, test } from 'bun:test';
import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/pg-proxy';
import type { DatabaseClient } from '@/lib/db';
import { Mods, Ruleset } from '@otr/core/osu';
import { getBeatmapModLabel } from '@/lib/utils/mods';
import { getPlayerModPerformance } from '../playerModStats';

const databaseUrl = process.env.SEARCH_TEST_DATABASE_URL;
type Row = {
  mods?: number;
  score?: number;
  player?: number;
  ruleset?: number;
  scoring?: number;
  time?: string;
  scoreStatus?: number;
  gameStatus?: number;
  matchStatus?: number;
  tournamentStatus?: number;
};
function fixture(rows: Row[]) {
  const values = rows
    .map(
      (r, i) =>
        `(${i + 1},${r.mods ?? 0},${r.score ?? 100000},${r.player ?? 1},${r.ruleset ?? 0},${r.scoring ?? 3},'${r.time ?? '2026-01-15'}'::timestamptz,${r.scoreStatus ?? 4},${r.gameStatus ?? 4},${r.matchStatus ?? 4},${r.tournamentStatus ?? 4})`
    )
    .join(',');
  return `WITH fixture(id,mods,score,player_id,ruleset,scoring_type,start_time,score_status,game_status,match_status,tournament_status) AS (VALUES ${values}),
 tournaments AS (SELECT id,ruleset,tournament_status verification_status FROM fixture),
 matches AS (SELECT id,id tournament_id,match_status verification_status FROM fixture),
 games AS (SELECT id,id match_id,scoring_type,start_time,game_status verification_status FROM fixture),
 game_scores AS (SELECT id,id game_id,player_id,mods,score,score_status verification_status FROM fixture) `;
}

test.skipIf(!databaseUrl)(
  'raw-score medians use final labels and one fully verified population',
  async () => {
    const db = new SQL(databaseUrl!, { max: 1 });
    try {
      await db.begin(async (tx) => {
        await tx`SET TRANSACTION READ ONLY`;
        async function run(
          rows: Row[],
          ruleset = Ruleset.Osu,
          bounds: { start?: string | null; end?: string | null } = {}
        ) {
          const proxy = drizzle(async (query, params) => ({
            rows: await tx.unsafe(fixture(rows) + query, params).values(),
          }));
          return getPlayerModPerformance(
            proxy as unknown as DatabaseClient,
            1,
            ruleset,
            bounds
          );
        }
        const raw = [
          { mods: Mods.Hidden, score: 100000 },
          { mods: Mods.Hidden, score: 200000 },
          { mods: Mods.Hidden, score: 300000 },
          { mods: Mods.Hidden | Mods.NoFail, score: 900000 },
          { mods: Mods.Nightcore, score: 100000 },
          { mods: Mods.DoubleTime, score: 500000 },
          { mods: Mods.SpunOut, score: 0 },
          { mods: Mods.Key7, score: 200000 },
          { mods: 0, score: 400000 },
        ];
        const baseline = await run(raw);
        expect(baseline).toEqual(
          expect.arrayContaining([
            { label: 'HD', count: 4, medianScore: 250000 },
            { label: 'DT', count: 2, medianScore: 300000 },
            { label: 'NM', count: 3, medianScore: 200000 },
          ])
        );
        expect(baseline).toHaveLength(3);
        for (const key of [
          'scoreStatus',
          'gameStatus',
          'matchStatus',
          'tournamentStatus',
        ]) {
          for (const status of [0, 1, 2, 3])
            expect(
              await run([...raw, { [key]: status, score: 9999999 }])
            ).toEqual(baseline);
        }
        expect(
          await run([
            ...raw,
            { player: 2, score: 9999999 },
            { ruleset: 4, score: 9999999 },
            { scoring: 0, score: 9999999 },
            { scoring: 4, score: 9999999 },
          ])
        ).toEqual(baseline);
        expect(
          await run(
            [
              { ruleset: 4, score: 123 },
              { ruleset: 5, score: 999 },
            ],
            Ruleset.Mania4k
          )
        ).toEqual([{ label: 'NM', count: 1, medianScore: 123 }]);
        expect(
          await run(
            [
              { time: '2026-01-01', score: 100 },
              { time: '2026-01-31', score: 300 },
              { time: '2025-12-31', score: 900 },
              { time: '2026-02-01', score: 900 },
            ],
            Ruleset.Osu,
            { start: '2026-01-01', end: '2026-01-31' }
          )
        ).toEqual([{ label: 'NM', count: 2, medianScore: 200 }]);
        for (const ruleset of [
          Ruleset.Osu,
          Ruleset.Taiko,
          Ruleset.Catch,
          Ruleset.ManiaOther,
          Ruleset.Mania4k,
          Ruleset.Mania7k,
        ]) {
          expect(
            await run(
              [
                { ruleset, score: 111 },
                { ruleset: (ruleset + 1) % 6, score: 999 },
              ],
              ruleset
            )
          ).toEqual([{ label: 'NM', count: 1, medianScore: 111 }]);
        }
        expect(await run([{ scoreStatus: 0 }])).toEqual([]);
        for (const mods of [
          0,
          Mods.Key7,
          Mods.Hidden | Mods.HardRock,
          Mods.Nightcore | Mods.NoFail,
          Mods.DoubleTime | Mods.Nightcore,
          Mods.Flashlight,
          Mods.Mirror,
        ]) {
          expect(await run([{ mods, score: 7 }])).toEqual([
            { label: getBeatmapModLabel(mods), count: 1, medianScore: 7 },
          ]);
        }
      });
    } finally {
      await db.close();
    }
  }
);
