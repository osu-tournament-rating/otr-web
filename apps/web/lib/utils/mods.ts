import { Mods } from '@otr/core/osu';
import { ModsEnumHelper } from '../enums';

/** Mod multipliers (ScoreV2, common tournament mods) */
const modMultipliers: Record<number, number> = {
  [Mods.HardRock]: 1.1,
  [Mods.Hidden]: 1.06,
  [Mods.DoubleTime]: 1.2,
  [Mods.Nightcore]: 1.12,
  [Mods.Flashlight]: 1.12,
  [Mods.HalfTime]: 1.0 / 3.0,
  [Mods.SpunOut]: 0.9,
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
  // Strip NF and SO
  mods &= ~Mods.NoFail;
  mods &= ~Mods.SpunOut;

  switch (mods) {
    // Simply return the mod color for both arguments
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
    case Mods.DoubleTime || Mods.Nightcore:
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
    case Mods.Relax || Mods.Autoplay || Mods.Relax2:
      return 'var(--mod-relax)';
    case Mods.Mirror:
      return 'var(--mod-mirror)';
    case Mods.SpunOut:
      return 'var(--mod-spun-out)';
    case Mods.Random:
      return 'var(--mod-random)';
    case Mods.Key1 ||
      Mods.Key2 ||
      Mods.Key3 ||
      Mods.Key5 ||
      Mods.Key6 ||
      Mods.Key7 ||
      Mods.Key8 ||
      Mods.Key9:
      return 'var(--mod-mania-key)';
    default:
      return 'var(--chart-1)';
  }
}

/**
 * Gets the most commonly used mod for a beatmap across tournament games
 * @param beatmapOsuId The osu! ID of the beatmap
 * @param tournamentGames Array of all games in the tournament
 * @returns Object with the most common mod and total game count, or null if no games found
 */
export function getMostCommonModForBeatmap(
  beatmapOsuId: number,
  tournamentGames: Array<{ beatmap?: { osuId: number } | null; mods: Mods }>
): { mod: Mods; gameCount: number } | null {
  const beatmapGames = tournamentGames.filter(
    (game) => game.beatmap?.osuId === beatmapOsuId
  );

  if (beatmapGames.length === 0) {
    return null;
  }

  const modCounts = new Map<Mods, number>();

  for (const game of beatmapGames) {
    const currentCount = modCounts.get(game.mods) || 0;
    modCounts.set(game.mods, currentCount + 1);
  }

  let mostCommonMod = Mods.None;
  let maxCount = 0;

  for (const [mod, count] of modCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonMod = mod;
    }
  }

  return {
    mod: mostCommonMod,
    gameCount: beatmapGames.length,
  };
}
