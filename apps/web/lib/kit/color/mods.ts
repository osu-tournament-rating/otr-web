import { Mods } from '@otr/core/osu';

import { normalizeBeatmapDisplayMods } from '@/lib/utils/mods';

import { CATEGORICAL_OTHER } from './categorical';
import { themeColor, type ThemeColor } from './theme-color';

export interface ModColor extends ThemeColor {
  /** The display label, such as `HDHR`. */
  label: string;
  /** The display combinations this colour stands for. */
  mods: readonly Mods[];
}

function mod(
  label: string,
  mods: readonly Mods[],
  light: string,
  dark: string
): ModColor {
  return {
    ...themeColor(`--mod-${label.toLowerCase()}`, light, dark, 'mark'),
    label,
    mods,
  };
}

const KEY_MODS = [
  Mods.Key1,
  Mods.Key2,
  Mods.Key3,
  Mods.Key4,
  Mods.Key5,
  Mods.Key6,
  Mods.Key7,
  Mods.Key8,
  Mods.Key9,
] as const;

/**
 * Mod colours for chart marks, swatches and solid mod pills: the colours the
 * site has always used, with each hue kept and only the lightness moved as
 * far as the contrast rules need. Every entry clears 3:1 on light and dark
 * cards and takes black text as a solid fill (`MOD_FILL_FOREGROUND`), which
 * is why the light theme's are darker. Touch Device, which shared Sudden
 * Death's orange, is a greyer orange, and Random a greyer green than Half
 * Time, so no two mods look alike.
 */
export const MOD_PALETTE: readonly ModColor[] = [
  mod('NM', [Mods.None], '#4589f2', '#4e93fc'),
  mod('HD', [Mods.Hidden], '#a18902', '#f4dc71'),
  mod('HR', [Mods.HardRock], '#db675e', '#f27c71'),
  mod('DT', [Mods.DoubleTime], '#8971f4', '#8971f4'),
  mod('HT', [Mods.HalfTime], '#029f54', '#3cd77d'),
  mod('EZ', [Mods.Easy], '#1aa101', '#7af46c'),
  mod('FL', [Mods.Flashlight], '#6970b7', '#6970b7'),
  mod('HDHR', [Mods.Hidden | Mods.HardRock], '#ff3381', '#ff3381'),
  mod('EZHD', [Mods.Easy | Mods.Hidden], '#b87f04', '#ffc365'),
  mod('EZDT', [Mods.Easy | Mods.DoubleTime], '#049a9b', '#32c3c3'),
  mod('HDFL', [Mods.Hidden | Mods.Flashlight], '#4a7d91', '#4a7d91'),
  mod('HDDT', [Mods.Hidden | Mods.DoubleTime], '#b568e9', '#bf72f3'),
  mod('SD', [Mods.SuddenDeath], '#d56f01', '#ff9238'),
  mod('TD', [Mods.TouchDevice], '#a4846f', '#cbaa94'),
  mod('RX', [Mods.Relax, Mods.Autoplay, Mods.Relax2], '#0394ce', '#11a8e8'),
  mod('MR', [Mods.Mirror], '#778cab', '#bad1f3'),
  mod('RD', [Mods.Random], '#5a986c', '#83c395'),
  mod('KEY', KEY_MODS, '#5590be', '#84c0f0'),
];

/** Text on a solid mod fill. Every mod colour clears 4.5:1 with it. */
export const MOD_FILL_FOREGROUND = '#000000';

const MOD_COLOR_BY_MODS = new Map<number, ModColor>(
  MOD_PALETTE.flatMap((entry) => entry.mods.map((mods) => [mods, entry]))
);

/**
 * The palette entry for a combination, after the display rules (NF and SO
 * dropped, NC shown as DT). Undefined for combinations without a colour.
 */
export function getModPaletteEntry(mods: number): ModColor | undefined {
  return MOD_COLOR_BY_MODS.get(normalizeBeatmapDisplayMods(mods));
}

/** CSS colour for a mod combination; rare combinations get the "Other" neutral. */
export function getModPaletteColor(mods: number): string {
  return (getModPaletteEntry(mods) ?? CATEGORICAL_OTHER).css;
}
