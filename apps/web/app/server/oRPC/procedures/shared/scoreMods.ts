import { sql } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';
import { Mods } from '@otr/core/osu';
import { STRIPPED_SCORE_MODS_MASK } from '../beatmapStatsHelpers';

const NIGHTCORE_SQL = sql.raw(String(Mods.Nightcore));
const DOUBLE_TIME_SQL = sql.raw(String(Mods.DoubleTime));
const STRIPPED_MODS_SQL = sql.raw(String(STRIPPED_SCORE_MODS_MASK));
// SQL mirror of normalizeScoreModsArithmetic; the beatmapModNormalization test asserts parity
export const NORMALIZED_SCORE_MODS_SQL = sql<number>`
  CASE
    WHEN (${schema.gameScores.mods} & ${NIGHTCORE_SQL}) <> 0
      THEN ((${schema.gameScores.mods} & ~(${NIGHTCORE_SQL} | ${STRIPPED_MODS_SQL})) | ${DOUBLE_TIME_SQL})
    ELSE (${schema.gameScores.mods} & ~${STRIPPED_MODS_SQL})
  END`;
