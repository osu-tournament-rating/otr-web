/** Card-grid layout shared by the beatmap list and its loading skeleton. */
export const BEATMAP_CARD_GRID_CLASS =
  'grid auto-rows-fr grid-cols-1 gap-3 p-3 md:gap-4 md:p-4 lg:grid-cols-2';

/** The layouts the beatmap list can be rendered in, in toggle order. */
export const BEATMAP_LAYOUTS = ['cards', 'compact', 'table'] as const;

export type BeatmapLayout = (typeof BEATMAP_LAYOUTS)[number];

/** Guards a layout read back from the URL or from storage. */
export function isBeatmapLayout(value: unknown): value is BeatmapLayout {
  return BEATMAP_LAYOUTS.includes(value as BeatmapLayout);
}
