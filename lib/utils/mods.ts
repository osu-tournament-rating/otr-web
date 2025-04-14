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
 * @param mods Mods
 * @param score Score to normalize
 * @returns Normalized score after applying mod multipliers
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

export function getModColor(mods: Mods) {
  // Strip NF
  mods &= ~Mods.NoFail;
  console.log(mods);

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
    case Mods.Nightcore:
      return 'var(--mod-nightcore)';
    case Mods.Hidden | Mods.HardRock:
      return 'var(--mod-hidden-hard-rock)';
    case Mods.Hidden | Mods.Easy:
      return 'var(--mod-hidden-easy)';
    case Mods.Easy | Mods.DoubleTime:
      return 'var(--mod-easy-double-time)';
    case Mods.Hidden | Mods.Flashlight:
      return 'var(--mod-hidden-flashlight)';
    default:
      return 'var(--chart-2)';
  }
}
