import { Ruleset } from '@otr/core/osu';
import * as schema from '@otr/core/db/schema';

const PLACEHOLDER_DIFF_NAME = 'Pending fetch';
const PLACEHOLDER_NUMBER = 0;

export type BeatmapInsert = typeof schema.beatmaps.$inferInsert;

export const createPlaceholderBeatmap = (
  osuId: number,
  ruleset: Ruleset
): BeatmapInsert => ({
  osuId,
  ruleset,
  rankedStatus: PLACEHOLDER_NUMBER,
  diffName: PLACEHOLDER_DIFF_NAME,
  totalLength: PLACEHOLDER_NUMBER,
  drainLength: PLACEHOLDER_NUMBER,
  bpm: PLACEHOLDER_NUMBER,
  countCircle: PLACEHOLDER_NUMBER,
  countSlider: PLACEHOLDER_NUMBER,
  countSpinner: PLACEHOLDER_NUMBER,
  cs: PLACEHOLDER_NUMBER,
  hp: PLACEHOLDER_NUMBER,
  od: PLACEHOLDER_NUMBER,
  ar: PLACEHOLDER_NUMBER,
  sr: PLACEHOLDER_NUMBER,
  maxCombo: null,
  beatmapsetId: null,
  dataFetchStatus: PLACEHOLDER_NUMBER,
});
