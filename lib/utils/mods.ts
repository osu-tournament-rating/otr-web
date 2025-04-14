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
