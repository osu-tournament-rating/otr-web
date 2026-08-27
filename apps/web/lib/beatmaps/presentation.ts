import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
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

type BeatmapSetOwner = { id: number; username: string };

type BeatmapMetadata = {
  artistOverride?: string | null;
  titleOverride?: string | null;
  setOwnerOverride?: BeatmapSetOwner | null;
  beatmapset?: {
    artist?: string;
    title?: string;
    creator?: BeatmapSetOwner | null;
  } | null;
};

export function getBeatmapArtist(beatmap: BeatmapMetadata): string | null {
  return beatmap.artistOverride || beatmap.beatmapset?.artist || null;
}

export function getBeatmapTitle(beatmap: BeatmapMetadata): string | null {
  return beatmap.titleOverride || beatmap.beatmapset?.title || null;
}

export function getBeatmapSetOwner<T extends BeatmapSetOwner>(beatmap: {
  setOwnerOverride?: T | null;
  beatmapset?: { creator?: T | null } | null;
}): T | null {
  return beatmap.setOwnerOverride ?? beatmap.beatmapset?.creator ?? null;
}

/** osu! no longer serves the beatmap and no admin has filled its metadata in. */
export function isDeletedBeatmap(beatmap: {
  dataFetchStatus?: number | null;
  manualOverride?: boolean | null;
}): boolean {
  return (
    beatmap.dataFetchStatus === DataFetchStatus.NotFound &&
    !beatmap.manualOverride
  );
}
