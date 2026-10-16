import { themeColor, type ThemeColor } from './theme-color';

export interface CategoricalColor extends ThemeColor {
  /** 1-based slot in the fixed order. */
  slot: number;
  name: string;
}

function slot(
  index: number,
  name: string,
  light: string,
  dark: string
): CategoricalColor {
  return {
    ...themeColor(`--series-${index}`, light, dark, 'mark'),
    slot: index,
    name,
  };
}

/**
 * The fixed categorical palette for neutral series, rank ranges and teams.
 * The order keeps neighbours apart for red-green colour blindness (checked
 * with the dataviz palette validator), so assign slots in order and never
 * reorder or cycle them. Slot 1 is the brand blue a single series uses.
 */
export const CATEGORICAL_PALETTE: readonly CategoricalColor[] = [
  slot(1, 'Blue', '#4589f2', '#4e93fc'),
  slot(2, 'Orange', '#e6632f', '#d95926'),
  slot(3, 'Aqua', '#049e6d', '#199e70'),
  slot(4, 'Yellow', '#bd7f03', '#c98500'),
  slot(5, 'Magenta', '#d36992', '#d55181'),
  slot(6, 'Green', '#008300', '#008300'),
  slot(7, 'Violet', '#4a3aa7', '#9085e9'),
  slot(8, 'Red', '#e34948', '#e66767'),
];

/** The neutral a series past the eighth folds into, labelled "Other". */
export const CATEGORICAL_OTHER: ThemeColor = themeColor(
  '--series-other',
  '#7a7a7a',
  '#929292',
  'mark'
);

/**
 * The colour of the series at `index` (0-based). Colour follows the series,
 * not its rank, so pass a stable index. Anything past the eighth slot gets
 * the "Other" neutral rather than a repeat.
 */
export function seriesColor(index: number): string {
  return (CATEGORICAL_PALETTE[index] ?? CATEGORICAL_OTHER).css;
}
