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

/** Attributes for a ruleset in reading order; inapplicable ones are muted, not dropped. */
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

/** Metadata an admin filled in by hand, else the beatmapset's. */
type BeatmapMetadata = {
  artist?: string | null;
  title?: string | null;
  beatmapset?: { artist?: string; title?: string } | null;
};

export function getBeatmapArtist(beatmap: BeatmapMetadata): string | null {
  return beatmap.artist || beatmap.beatmapset?.artist || null;
}

export function getBeatmapTitle(beatmap: BeatmapMetadata): string | null {
  return beatmap.title || beatmap.beatmapset?.title || null;
}

/** A pooled beatmap whose set osu! no longer serves, detected by absent metadata. */
export function isDeletedTournamentBeatmap(beatmap: BeatmapMetadata): boolean {
  return !getBeatmapArtist(beatmap) && !getBeatmapTitle(beatmap);
}
