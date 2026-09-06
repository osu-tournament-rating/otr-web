import { expect, test } from 'bun:test';
import { SQL } from 'bun';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.SEARCH_TEST_DATABASE_URL;
type Query = { sql: string; params: unknown[] };

function fixture(level?: string, status = 4) {
  const extra = level
    ? ` UNION ALL SELECT 2, ${level === 'tournament' ? status : 4}, ${level === 'match' ? status : 4}, ${level === 'game' ? status : 4}, ${level === 'score' ? status : 4}`
    : '';
  return `WITH chain(id,tournament_status,match_status,game_status,score_status) AS (SELECT 1,4,4,4,4${extra}),
 tournaments AS (SELECT id,tournament_status verification_status, 'Pool '||id name, 1000 rank_range_lower_bound FROM chain),
 matches AS (SELECT id,id tournament_id,match_status verification_status FROM chain),
 games AS (SELECT id,id match_id,1 beatmap_id,game_status verification_status,0 mods,'2026-01-01'::timestamptz start_time FROM chain),
 game_scores AS (SELECT c.id*10+n id,c.id game_id,c.id player_id,c.score_status verification_status,0 mods,CASE WHEN c.id=1 THEN 100000*n ELSE 10000000 END score,CASE WHEN c.id=1 THEN 0.9 ELSE 0.1 END accuracy,0 stat_miss,3 grade FROM chain c CROSS JOIN generate_series(1,5) n),
 rating_adjustments AS (SELECT id player_id,id match_id,800::float8 rating_before FROM chain),
 players AS (SELECT id,id osu_id,'Player '||id username,'US' country,0 default_ruleset FROM chain),
 join_pooled_beatmaps AS (SELECT id tournaments_pooled_in_id,1 pooled_beatmaps_id FROM chain) `;
}

test.skipIf(!databaseUrl)(
  'beatmap performance queries require verified scores and every parent',
  async () => {
    const capture = Bun.spawn(
      [
        process.execPath,
        fileURLToPath(
          new URL('./fixtures/captureBeatmapStatsQueries.ts', import.meta.url)
        ),
      ],
      {
        cwd: fileURLToPath(new URL('../../../../../', import.meta.url)),
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    const [output, errors, exitCode] = await Promise.all([
      new Response(capture.stdout).text(),
      new Response(capture.stderr).text(),
      capture.exited,
    ]);
    expect(exitCode, errors).toBe(0);
    const queries = JSON.parse(output.trim().split('\n').at(-1)!) as Query[];
    const scoreQueries = queries.filter((query) =>
      query.sql.includes('from "game_scores"')
    );
    expect(scoreQueries).toHaveLength(12);
    const poolQuery = queries[5];
    expect(poolQuery.sql).toContain('join_pooled_beatmaps');
    expect(poolQuery.sql).toContain('FILTER');
    const db = new SQL(databaseUrl!, { max: 1 });
    try {
      await db.begin(async (tx) => {
        await tx`SET TRANSACTION READ ONLY`;
        for (const query of scoreQueries) {
          const baseline = await tx
            .unsafe(fixture() + query.sql, query.params)
            .values();
          expect(baseline.length).toBeGreaterThan(0);
          for (const level of ['score', 'game', 'match', 'tournament']) {
            for (const status of [0, 1, 2, 3]) {
              const actual = await tx
                .unsafe(fixture(level, status) + query.sql, query.params)
                .values();
              expect(actual, `${level} status ${status}: ${query.sql}`).toEqual(
                baseline
              );
            }
          }
        }
        for (const status of [0, 1, 2, 3]) {
          const rows = await tx
            .unsafe(
              fixture('tournament', status) + poolQuery.sql,
              poolQuery.params
            )
            .values();
          expect(rows[0].map(Number)).toEqual([2, 1, 2]);
        }
      });
    } finally {
      await db.close();
    }
  }
);
