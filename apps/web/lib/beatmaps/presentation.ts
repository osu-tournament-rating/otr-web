import { Ruleset } from '@otr/core/osu';

import { RulesetEnumHelper } from '@/lib/enum-helpers';

export function getBeatmapDisplayRuleset(
  ruleset: Ruleset,
  difficultyName: string
): Ruleset {
  if (ruleset !== Ruleset.ManiaOther) return ruleset;

  if (/\b4K\b/i.test(difficultyName)) return Ruleset.Mania4k;
  if (/\b7K\b/i.test(difficultyName)) return Ruleset.Mania7k;

  return ruleset;
}

export function getBeatmapRulesetLabel(
  ruleset: Ruleset,
  difficultyName: string
): string {
  return RulesetEnumHelper.getMetadata(
    getBeatmapDisplayRuleset(ruleset, difficultyName)
  ).text;
}

export function isManiaRuleset(ruleset: Ruleset): boolean {
  return (
    ruleset === Ruleset.ManiaOther ||
    ruleset === Ruleset.Mania4k ||
    ruleset === Ruleset.Mania7k
  );
}

/** One row of the beatmap attributes card, resolved per ruleset. */
export interface BeatmapAttributeRow {
  abbreviation: string;
  label: string;
  key: 'cs' | 'ar' | 'od' | 'hp';
  /** Dim the row because the attribute does not affect this ruleset. */
  muted?: boolean;
  /** Draw the 0–10 gauge. Defaults to true. */
  gauge?: boolean;
  /** Render a rounded integer instead of one decimal place. */
  integer?: boolean;
}

const CS = { abbreviation: 'CS', label: 'Circle size', key: 'cs' } as const;
const AR = { abbreviation: 'AR', label: 'Approach rate', key: 'ar' } as const;
const OD = {
  abbreviation: 'OD',
  label: 'Overall difficulty',
  key: 'od',
} as const;
const HP = { abbreviation: 'HP', label: 'HP drain', key: 'hp' } as const;

/**
 * Attributes worth showing for a ruleset, in reading order. Attributes that do
 * not apply are muted rather than dropped so the raw value stays visible.
 */
export function getBeatmapAttributeRows(
  ruleset: Ruleset
): BeatmapAttributeRow[] {
  if (isManiaRuleset(ruleset)) {
    return [
      {
        abbreviation: 'Keys',
        label: 'Key count',
        key: 'cs',
        gauge: false,
        integer: true,
      },
      { ...OD },
      { ...HP },
      { ...AR, muted: true, gauge: false },
    ];
  }

  switch (ruleset) {
    case Ruleset.Taiko:
      return [
        { ...OD },
        { ...HP },
        { ...CS, muted: true, gauge: false },
        { ...AR, muted: true, gauge: false },
      ];
    case Ruleset.Catch:
      return [
        { ...AR },
        { ...CS },
        { ...HP },
        { ...OD, muted: true, gauge: false },
      ];
    default:
      return [{ ...CS }, { ...AR }, { ...OD }, { ...HP }];
  }
}

/**
 * A pooled beatmap whose set was deleted from osu!: the fetch left no metadata
 * behind. Testing the absent data rather than the 'Unknown Artist'/'Unknown
 * Title' fallback strings, which a real map is free to be called.
 */
export function isDeletedTournamentBeatmap(beatmap: {
  beatmapset?: { artist?: string; title?: string } | null;
}): boolean {
  return !beatmap.beatmapset?.artist && !beatmap.beatmapset?.title;
}
