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
 * Mod colours for chart marks, swatches and solid mod pills. No Mod has its
 * own colour, every entry clears 3:1 on light and dark cards, and every
 * entry takes black text when used as a solid fill (`MOD_FILL_FOREGROUND`).
 */
export const MOD_PALETTE: readonly ModColor[] = [
  mod('NM', [Mods.None], '#0b8d9e', '#4cb8c9'),
  mod('HD', [Mods.Hidden], '#948000', '#c1aa2a'),
  mod('HR', [Mods.HardRock], '#d9524f', '#ff8780'),
  mod('DT', [Mods.DoubleTime], '#876fd5', '#b09bff'),
  mod('HT', [Mods.HalfTime], '#0b9360', '#4cbd88'),
  mod('EZ', [Mods.Easy], '#628d00', '#87b930'),
  mod('FL', [Mods.Flashlight], '#6076b5', '#758ccc'),
  mod('HDHR', [Mods.Hidden | Mods.HardRock], '#d1528c', '#ff80b5'),
  mod('EZHD', [Mods.Easy | Mods.Hidden], '#bd6c00', '#ef9437'),
  mod('EZDT', [Mods.Easy | Mods.DoubleTime], '#2b89c0', '#68c1fb'),
  mod('HDFL', [Mods.Hidden | Mods.Flashlight], '#957164', '#ae887b'),
  mod('HDDT', [Mods.Hidden | Mods.DoubleTime], '#af63ba', '#db8de8'),
  mod('SD', [Mods.SuddenDeath], '#d75a21', '#fd7d48'),
  mod('TD', [Mods.TouchDevice], '#9d8757', '#d9c190'),
  mod('RX', [Mods.Relax, Mods.Autoplay, Mods.Relax2], '#279785', '#70d6c2'),
  mod('MR', [Mods.Mirror], '#9181b0', '#d4c3f5'),
  mod('RD', [Mods.Random], '#469b4c', '#82d785'),
  mod('KEY', KEY_MODS, '#5f8fa3', '#a1d3e8'),
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
