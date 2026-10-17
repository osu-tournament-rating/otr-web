import { Ruleset } from '@otr/core/osu';

import { getRulesetLabel } from '@/lib/kit/format/ruleset';

export function getBeatmapDisplayRuleset(
  ruleset: Ruleset,
  difficultyName: string
): Ruleset {
  if (ruleset !== Ruleset.ManiaOther) return ruleset;

  if (/\b4K\b/i.test(difficultyName)) return Ruleset.Mania4k;
  if (/\b7K\b/i.test(difficultyName)) return Ruleset.Mania7k;

  return ruleset;
}

/** The short label (`mania 4K`), reading 4K and 7K from the difficulty name. */
export function getBeatmapRulesetLabel(
  ruleset: Ruleset,
  difficultyName: string
): string {
  return getRulesetLabel(getBeatmapDisplayRuleset(ruleset, difficultyName));
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
  /** The label on screen: osu!'s own short form, such as CS, or Keys. */
  label: string;
  /** The full name screen readers hear in place of a short form. */
  fullName?: string;
  key: 'cs' | 'ar' | 'od' | 'hp';
  /** Dim the row because the attribute does not affect this ruleset. */
  muted?: boolean;
  /** Draw the 0–10 gauge. Defaults to true. */
  gauge?: boolean;
  /** Render a rounded integer instead of one decimal place. */
  integer?: boolean;
}

const CS = { label: 'CS', fullName: 'Circle size', key: 'cs' } as const;
const AR = { label: 'AR', fullName: 'Approach rate', key: 'ar' } as const;
const OD = { label: 'OD', fullName: 'Overall difficulty', key: 'od' } as const;
const HP = { label: 'HP', fullName: 'HP drain', key: 'hp' } as const;

/** Attributes for a ruleset in reading order; inapplicable ones are muted, not dropped. */
export function getBeatmapAttributeRows(
  ruleset: Ruleset
): BeatmapAttributeRow[] {
  if (isManiaRuleset(ruleset)) {
    return [
      // A plain word, so it needs no full name.
      { label: 'Keys', key: 'cs', gauge: false, integer: true },
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
  artistOverride?: string | null;
  titleOverride?: string | null;
  beatmapset?: { artist?: string; title?: string } | null;
};

export function getBeatmapArtist(beatmap: BeatmapMetadata): string | null {
  return beatmap.artistOverride || beatmap.beatmapset?.artist || null;
}

export function getBeatmapTitle(beatmap: BeatmapMetadata): string | null {
  return beatmap.titleOverride || beatmap.beatmapset?.title || null;
}

/** A pooled beatmap whose set osu! no longer serves, detected by absent metadata. */
export function isDeletedTournamentBeatmap(beatmap: BeatmapMetadata): boolean {
  return !getBeatmapArtist(beatmap) && !getBeatmapTitle(beatmap);
}
