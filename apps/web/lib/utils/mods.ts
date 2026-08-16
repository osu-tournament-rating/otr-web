import { Mods } from '@otr/core/osu';
import { ModsEnumHelper } from '../enum-helpers';

export interface BeatmapModScoreCount {
  mods: number;
  scoreCount: number;
}

export interface BeatmapModDistributionEntry {
  mods: Mods;
  label: string;
  scoreCount: number;
  percentage: number;
}

export const BEATMAP_MOD_DISPLAY_THRESHOLD_PERCENTAGE = 1;
export const BEATMAP_LIST_SECOND_MOD_GROUP_MIN_PERCENTAGE = 20;

/** Strips NF/SO and folds NC into DT, the display form of a mod combination. */
export function normalizeBeatmapDisplayMods(mods: number): Mods {
  let normalized = mods & ~Mods.NoFail & ~Mods.SpunOut;

  if (normalized & Mods.Nightcore) {
    normalized = (normalized | Mods.DoubleTime) & ~Mods.Nightcore;
  }

  return normalized as Mods;
}

export function getBeatmapModLabel(mods: number): string {
  const label = ModsEnumHelper.getMetadata(normalizeBeatmapDisplayMods(mods))
    .map(({ text }) => text)
    .join('');

  return label || 'NM';
}

/** Buckets grouped score counts by label and converts them to percentages. */
function aggregateModDistribution(
  rows: BeatmapModScoreCount[],
  categorize: (mods: number) => { mods: Mods; label: string }
): BeatmapModDistributionEntry[] {
  const distributionByLabel = new Map<
    string,
    Omit<BeatmapModDistributionEntry, 'percentage'>
  >();
  let totalScoreCount = 0;

  for (const row of rows) {
    if (!Number.isFinite(row.scoreCount) || row.scoreCount <= 0) continue;

    const category = categorize(row.mods);
    const existing = distributionByLabel.get(category.label);

    distributionByLabel.set(category.label, {
      mods: existing?.mods ?? category.mods,
      label: category.label,
      scoreCount: (existing?.scoreCount ?? 0) + row.scoreCount,
    });
    totalScoreCount += row.scoreCount;
  }

  if (totalScoreCount === 0) return [];

  return Array.from(distributionByLabel.values())
    .map((entry) => ({
      ...entry,
      percentage: (entry.scoreCount / totalScoreCount) * 100,
    }))
    .sort(
      (left, right) =>
        right.scoreCount - left.scoreCount ||
        left.label.localeCompare(right.label)
    );
}

/** Aggregates grouped score counts using the beatmap chart's display rules. */
export function calculateBeatmapModDistribution(
  rows: BeatmapModScoreCount[]
): BeatmapModDistributionEntry[] {
  return aggregateModDistribution(rows, (rawMods) => {
    const mods = normalizeBeatmapDisplayMods(rawMods);
    return { mods, label: getBeatmapModLabel(mods) };
  });
}

/** Collapses a score's mods into the broad category used by the beatmap list. */
export function getBeatmapListModCategory(mods: number): {
  mods: Mods;
  label: string;
} {
  const normalizedMods = normalizeBeatmapDisplayMods(mods);

  const hasDoubleTime = Boolean(normalizedMods & Mods.DoubleTime);
  const hasEasy = Boolean(normalizedMods & Mods.Easy);
  const hasHalfTime = Boolean(normalizedMods & Mods.HalfTime);
  const hasHardRock = Boolean(normalizedMods & Mods.HardRock);
  const hasFlashlight = Boolean(normalizedMods & Mods.Flashlight);

  if (hasDoubleTime) {
    return hasEasy
      ? { mods: Mods.DoubleTime | Mods.Easy, label: 'DTEZ' }
      : { mods: Mods.DoubleTime, label: 'DT' };
  }

  if (hasHalfTime) {
    return hasEasy || hasFlashlight
      ? { mods: Mods.None, label: 'Other' }
      : { mods: Mods.HalfTime, label: 'HT' };
  }

  const remainingBaseMods = [hasHardRock, hasEasy, hasFlashlight].filter(
    Boolean
  ).length;

  if (remainingBaseMods > 1) {
    return { mods: Mods.None, label: 'Other' };
  }
  if (hasHardRock) return { mods: Mods.HardRock, label: 'HR' };
  if (hasEasy) return { mods: Mods.Easy, label: 'EZ' };
  if (hasFlashlight) return { mods: Mods.Flashlight, label: 'FL' };

  if (normalizedMods === Mods.None) return { mods: Mods.None, label: 'NM' };
  if (normalizedMods === Mods.Hidden) {
    return { mods: Mods.Hidden, label: 'HD' };
  }

  return { mods: Mods.None, label: 'Other' };
}

/** Aggregates score counts using only the beatmap list's broad mod buckets. */
export function calculateBeatmapListModDistribution(
  rows: BeatmapModScoreCount[]
): BeatmapModDistributionEntry[] {
  return aggregateModDistribution(rows, getBeatmapListModCategory);
}

export const BEATMAP_MOD_OTHER_LABEL = 'Other';

/** Moves every combination below the display threshold into a trailing "Other" slice. */
export function collapseBeatmapModDistribution(
  distribution: BeatmapModDistributionEntry[],
  minimumPercentage = BEATMAP_MOD_DISPLAY_THRESHOLD_PERCENTAGE
): BeatmapModDistributionEntry[] {
  const displayed: BeatmapModDistributionEntry[] = [];
  const collapsed: BeatmapModDistributionEntry[] = [];

  for (const entry of distribution) {
    (entry.percentage >= minimumPercentage ? displayed : collapsed).push(entry);
  }

  if (collapsed.length === 0) return displayed;

  return [
    ...displayed,
    {
      mods: Mods.None,
      label: BEATMAP_MOD_OTHER_LABEL,
      scoreCount: collapsed.reduce(
        (total, { scoreCount }) => total + scoreCount,
        0
      ),
      percentage: collapsed.reduce(
        (total, { percentage }) => total + percentage,
        0
      ),
    },
  ];
}

export function filterBeatmapModDistribution(
  distribution: BeatmapModDistributionEntry[],
  minimumPercentage = BEATMAP_MOD_DISPLAY_THRESHOLD_PERCENTAGE
): BeatmapModDistributionEntry[] {
  return distribution.filter(
    ({ percentage }) => percentage >= minimumPercentage
  );
}

/** The mod groups shown in the beatmap list: the leading one, plus a runner-up above 20%. */
export function selectBeatmapListModGroups<T extends { percentage: number }>(
  groups: readonly T[]
): T[] {
  const [primaryGroup, secondaryGroup] = groups;

  if (!primaryGroup) return [];
  if (
    !secondaryGroup ||
    secondaryGroup.percentage < BEATMAP_LIST_SECOND_MOD_GROUP_MIN_PERCENTAGE
  ) {
    return [primaryGroup];
  }

  return [primaryGroup, secondaryGroup];
}

// ScoreV2 multipliers for the common tournament mods.
const modMultipliers: Record<number, number> = {
  [Mods.HardRock]: 1.1,
  [Mods.Hidden]: 1.06,
  [Mods.DoubleTime]: 1.2,
  [Mods.Nightcore]: 1.2,
  [Mods.Flashlight]: 1.12,
  [Mods.HalfTime]: 1.0 / 3.0,
  [Mods.SpunOut]: 0.9,
};

/** Removes the mod multipliers from a raw score. */
export function normalizedScore(mods: Mods, score: number): number {
  if (score < 0) {
    return 0;
  }

  const flags = ModsEnumHelper.getFlags(mods);
  let multiplier = 1.0;

  for (const [modFlag, modMultiplier] of Object.entries(modMultipliers)) {
    if (flags.includes(Number(modFlag))) {
      multiplier *= modMultiplier;
    }
  }

  return Math.round(score / multiplier);
}

/** CSS color variable for a mod combination. */
export function getModColor(mods: Mods) {
  mods = normalizeBeatmapDisplayMods(mods);

  switch (mods) {
    case Mods.None:
      return 'var(--chart-1)';
    case Mods.HardRock:
      return 'var(--mod-hard-rock)';
    case Mods.Hidden:
      return 'var(--mod-hidden)';
    case Mods.Flashlight:
      return 'var(--mod-flashlight)';
    case Mods.Easy:
      return 'var(--mod-easy)';
    case Mods.DoubleTime:
      return 'var(--mod-double-time)';
    case Mods.HalfTime:
      return 'var(--mod-half-time)';
    case Mods.Hidden | Mods.HardRock:
      return 'var(--mod-hidden-hard-rock)';
    case Mods.Hidden | Mods.Easy:
      return 'var(--mod-hidden-easy)';
    case Mods.Easy | Mods.DoubleTime:
      return 'var(--mod-easy-double-time)';
    case Mods.Hidden | Mods.Flashlight:
      return 'var(--mod-hidden-flashlight)';
    case Mods.Hidden | Mods.DoubleTime:
      return 'var(--mod-hidden-double-time)';
    case Mods.SuddenDeath:
      return 'var(--mod-sudden-death)';
    case Mods.TouchDevice:
      return 'var(--mod-touch-device)';
    case Mods.Relax:
    case Mods.Autoplay:
    case Mods.Relax2:
      return 'var(--mod-relax)';
    case Mods.Mirror:
      return 'var(--mod-mirror)';
    case Mods.Random:
      return 'var(--mod-random)';
    case Mods.Key1:
    case Mods.Key2:
    case Mods.Key3:
    case Mods.Key4:
    case Mods.Key5:
    case Mods.Key6:
    case Mods.Key7:
    case Mods.Key8:
    case Mods.Key9:
      return 'var(--mod-mania-key)';
    default:
      return 'var(--chart-1)';
  }
}

/** Returns a readable neutral foreground for a solid mod-color background. */
export function getModForegroundColor(mods: Mods): string {
  const normalizedMods = normalizeBeatmapDisplayMods(mods);

  return normalizedMods === Mods.Flashlight ||
    normalizedMods === (Mods.Hidden | Mods.Flashlight)
    ? '#FFFFFF'
    : '#000000';
}

/**
 * The mods to display for a game: its own outside freemod, otherwise the single
 * combination every score shares, or FM when they vary.
 */
export function resolveGameDisplayMods(
  game: { isFreeMod: boolean; mods: Mods },
  scores: { mods: number }[]
): { mods: Mods; freemod: boolean } {
  if (!game.isFreeMod) {
    return { mods: game.mods, freemod: false };
  }

  // NoFail is never shown and shouldn't split otherwise-identical combinations.
  const mask = ~Mods.NoFail;
  const uniqueCombos = new Set(scores.map((s) => s.mods & mask));

  if (uniqueCombos.size === 1) {
    const [common] = uniqueCombos;
    return { mods: common as Mods, freemod: false };
  }

  return { mods: Mods.None, freemod: true };
}

/** Whether per-score mods diverge from a game that records no mods of its own. */
function hasModsVaryingFromGame(
  gameMods: number,
  scores: { mods: number }[]
): boolean {
  if (gameMods !== Mods.None) return false;
  const mask = ~Mods.NoFail;
  return scores.some((s) => (s.mods & mask) !== (gameMods & mask));
}

/** Freemod when the game carries the flag, or its scores' mods vary from its own. */
export function deriveGameIsFreeMod(
  gameMods: number,
  scores: { mods: number }[]
): boolean {
  return (
    (gameMods & Mods.FreeModAllowed) === Mods.FreeModAllowed ||
    hasModsVaryingFromGame(gameMods, scores)
  );
}
