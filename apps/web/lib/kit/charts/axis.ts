import type { NiceTicks } from './ticks';

/** 12px muted labels; the font is the page's Inter. */
export const CHART_TICK_STYLE = {
  fontSize: 12,
  fill: 'var(--muted-foreground)',
} as const;

/**
 * Shared props for every Recharts `XAxis` and `YAxis`: muted 12px labels, no
 * tick marks or axis line (the grid carries the scale).
 */
export const chartAxisProps = {
  tick: CHART_TICK_STYLE,
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

/** A value axis on the left that sizes itself to its longest label. */
export const chartValueAxisProps = {
  ...chartAxisProps,
  width: 'auto',
} as const;

/**
 * Horizontal dashed gridlines. `ChartContainer` paints them in the border
 * colour at half strength, so render charts inside it.
 */
export const chartGridProps = {
  strokeDasharray: '3 3',
  vertical: false,
} as const;

/** Room for the top tick label and the last x label. */
export const CHART_MARGIN = { top: 8, right: 12, bottom: 0, left: 0 } as const;

/** Rounded data ends for vertical bars, square at the baseline. */
export const CHART_BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

export const CHART_LINE_WIDTH = 2;

/**
 * The hover cursor: an accent band at half strength behind bars (`--muted`
 * matches the dark panel, so a muted band vanished there), a border-coloured
 * rule on lines. ChartContainer paints the bar band the same way.
 */
export const CHART_CURSOR = {
  bar: { fill: 'var(--accent)', fillOpacity: 0.5 },
  line: { stroke: 'var(--border)', strokeWidth: 1 },
} as const;

/**
 * Domain and ticks for a numeric axis from `getNiceTicks`. `interval: 0`
 * stops Recharts from dropping ticks the rule already spaced.
 */
export function niceAxisProps(nice: NiceTicks) {
  return {
    type: 'number' as const,
    domain: [nice.min, nice.max] as [number, number],
    ticks: nice.ticks,
    interval: 0 as const,
    allowDecimals: !nice.ticks.every(Number.isInteger),
  };
}
