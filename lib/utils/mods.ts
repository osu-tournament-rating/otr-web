import { Mods } from '@osu-tournament-rating/otr-api-client';
import { ModsEnumHelper } from '../enums';

/** Mod multipliers (ScoreV2, common tournament mods) */
const modMultipliers: Record<number, number> = {
  [Mods.HardRock]: 1.1,
  [Mods.Hidden]: 1.06,
  [Mods.DoubleTime]: 1.2,
  [Mods.Nightcore]: 1.12,
  [Mods.Flashlight]: 1.12,
  [Mods.HalfTime]: 1.0 / 3.0,
};

/**
 * Calculates a normalized score by applying mod multipliers
 * @param mods Mods applied to the score
 * @param score Raw score to normalize
 * @returns Normalized score after removing mod multiplier effects
 */
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

/**
 * Gets the CSS color variable for a given mod combination
 * @param mods Mod combination to get color for
 * @returns CSS color variable string
 */
export function getModColor(mods: Mods) {
  // Strip NF
  mods &= ~Mods.NoFail;

  switch (mods) {
    case Mods.None:
      return 'var(--chart-1)';
    case Mods.HardRock:
      return 'var(--mod-hard-rock, var(--chart-2))';
    case Mods.Hidden:
      return 'var(--mod-hidden, var(--chart-3))';
    case Mods.Flashlight:
      return 'var(--mod-flashlight, var(--chart-3))';
    case Mods.Easy:
      return 'var(--mod-easy, var(--chart-2))';
    case Mods.DoubleTime:
      return 'var(--mod-double-time, var(--chart-4))';
    case Mods.HalfTime:
      return 'var(--mod-half-time, var(--chart-4))';
    case Mods.Nightcore:
      return 'var(--mod-nightcore, var(--chart-4))';
    case Mods.Hidden | Mods.HardRock:
      return 'var(--mod-hidden-hard-rock, var(--chart-2))';
    case Mods.Hidden | Mods.Easy:
      return 'var(--mod-hidden-easy, var(--chart-3))';
    case Mods.Easy | Mods.DoubleTime:
      return 'var(--mod-easy-double-time, var(--chart-2))';
    case Mods.Hidden | Mods.Flashlight:
      return 'var(--mod-hidden-flashlight, var(--chart-3))';
    default:
      return 'var(--chart-1)';
  }
}
