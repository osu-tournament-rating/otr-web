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

/**
 * Removes score-level modifiers that the beatmap distribution treats as
 * incidental rather than distinct mod combinations.
 */
export function normalizeBeatmapDisplayMods(mods: number): Mods {
  return (mods & ~Mods.NoFail & ~Mods.SpunOut) as Mods;
}

export function getBeatmapModLabel(mods: number): string {
  const label = ModsEnumHelper.getMetadata(normalizeBeatmapDisplayMods(mods))
    .map(({ text }) => text)
    .join('');

  return label || 'NM';
}

/** Aggregates grouped score counts using the beatmap chart's display rules. */
export function calculateBeatmapModDistribution(
  rows: BeatmapModScoreCount[]
): BeatmapModDistributionEntry[] {
  const distributionByLabel = new Map<
    string,
    Omit<BeatmapModDistributionEntry, 'percentage'>
  >();
  let totalScoreCount = 0;

  for (const row of rows) {
    if (!Number.isFinite(row.scoreCount) || row.scoreCount <= 0) continue;

    const mods = normalizeBeatmapDisplayMods(row.mods);
    const label = getBeatmapModLabel(mods);
    const existing = distributionByLabel.get(label);

    distributionByLabel.set(label, {
      mods: existing?.mods ?? mods,
      label,
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

export function filterBeatmapModDistribution(
  distribution: BeatmapModDistributionEntry[],
  minimumPercentage = BEATMAP_MOD_DISPLAY_THRESHOLD_PERCENTAGE
): BeatmapModDistributionEntry[] {
  return distribution.filter(
    ({ percentage }) => percentage >= minimumPercentage
  );
}

/** Mod multipliers (ScoreV2, common tournament mods) */
const modMultipliers: Record<number, number> = {
  [Mods.HardRock]: 1.1,
  [Mods.Hidden]: 1.06,
  [Mods.DoubleTime]: 1.2,
  [Mods.Nightcore]: 1.2,
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

/**
 * Resolves which mods to display for a single game.
 *
 * For non-freemod games the game's own mods are authoritative. For freemod
 * games we display what players actually played: if every score shares a single
 * mod combination we show that combination (erring on the side of reality),
 * otherwise we fall back to the "FM" icon to signal that combinations varied.
 *
 * Shared with the game header (GameCardHeader) so the beatmap page resolves the
 * "most common mod" the same way instead of trusting the raw (often NoMod) game
 * mods of freemod lobbies.
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

  // No scores, or genuinely differing combinations -> keep the "FM" icon.
  return { mods: Mods.None, freemod: true };
}

/**
 * Whether per-score mods diverge from the game's own mods. Only meaningful when
 * the game records no mods of its own (freemod lobbies where each player picks).
 */
function hasModsVaryingFromGame(
  gameMods: number,
  scores: { mods: number }[]
): boolean {
  if (gameMods !== Mods.None) return false;
  const mask = ~Mods.NoFail;
  return scores.some((s) => (s.mods & mask) !== (gameMods & mask));
}

/**
 * Derives whether a game is freemod, matching how the match endpoints compute
 * it: either the game carries the freemod-allowed flag, or the per-score mods
 * vary from the game's mods.
 */
export function deriveGameIsFreeMod(
  gameMods: number,
  scores: { mods: number }[]
): boolean {
  return (
    (gameMods & Mods.FreeModAllowed) === Mods.FreeModAllowed ||
    hasModsVaryingFromGame(gameMods, scores)
  );
}

/**
 * Server-side convenience: resolve the display mods for a game from its raw mods
 * bitmask and the mods of its scores (freemod state derived, not supplied).
 */
export function resolveGameModsFromScores(
  gameMods: Mods,
  scoreMods: number[]
): { mods: Mods; freemod: boolean } {
  const scores = scoreMods.map((mods) => ({ mods }));
  return resolveGameDisplayMods(
    { isFreeMod: deriveGameIsFreeMod(gameMods, scores), mods: gameMods },
    scores
  );
}

/**
 * Picks the most common display mods across a set of games, each resolved via
 * {@link resolveGameModsFromScores}. Ties resolve to the first-seen combination,
 * mirroring SQL MODE() determinism over ordered input. Returns NoMod (NM) for an
 * empty set.
 */
export function mostCommonDisplayMods(
  games: Array<{ mods: Mods; scoreMods: number[] }>
): { mods: Mods; freemod: boolean } {
  const counts = new Map<
    string,
    { value: { mods: Mods; freemod: boolean }; count: number }
  >();

  for (const game of games) {
    const resolved = resolveGameModsFromScores(game.mods, game.scoreMods);
    const key = resolved.freemod ? 'fm' : String(resolved.mods);
    const entry = counts.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(key, { value: resolved, count: 1 });
    }
  }

  let best: { value: { mods: Mods; freemod: boolean }; count: number } | null =
    null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }

  return best?.value ?? { mods: Mods.None, freemod: false };
}
