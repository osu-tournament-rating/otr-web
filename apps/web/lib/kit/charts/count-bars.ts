/**
 * The rules behind `CountBarChart`, a count per category, kept pure so they
 * are unit-tested.
 */
import {
  DEFAULT_MAX_TICKS,
  NARROW_MAX_TICKS,
  type NiceTicks,
  getNiceTicks,
} from './ticks';

/** One bar: a category, its count, and an optional colour of its own. */
export interface CountBarDatum {
  /** Stable key, such as the stored enum value or the year. */
  key: string;
  /** The category as people read it: `osu!`, `4v4`, `2024`. */
  label: string;
  count: number;
  /** A palette colour for this bar alone (`var(--…)`), such as a status. */
  fill?: string;
}

/**
 * `columns` stand on a category axis along the bottom; `rows` put the
 * categories on the left, for long names.
 */
export type CountBarLayout = 'columns' | 'rows';

/**
 * Ticks for the count axis, from zero. A count along the bottom (rows)
 * thins to four ticks on phones, as time axes do; a value axis on the left
 * keeps six.
 */
export function getCountAxisTicks(
  data: readonly CountBarDatum[],
  {
    layout = 'columns',
    narrow = false,
  }: {
    layout?: CountBarLayout;
    narrow?: boolean;
  } = {}
): NiceTicks {
  const max = Math.max(
    0,
    ...data.map((bar) => (Number.isFinite(bar.count) ? bar.count : 0))
  );
  return getNiceTicks(0, max, {
    integer: true,
    maxTicks:
      layout === 'rows' && narrow ? NARROW_MAX_TICKS : DEFAULT_MAX_TICKS,
  });
}

/**
 * Whether the bars bring their own colours. Then every bar is drawn with
 * its `fill` (a bar without one falls back to the single-series colour);
 * otherwise all take slot 1 of the categorical palette.
 */
export function hasOwnFills(data: readonly CountBarDatum[]): boolean {
  return data.some((bar) => bar.fill !== undefined);
}
