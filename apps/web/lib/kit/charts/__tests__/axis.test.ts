import { describe, expect, it } from 'bun:test';

import {
  CHART_BAR_RADIUS,
  CHART_CURSOR,
  CHART_MARGIN,
  CHART_ROW_BAR_RADIUS,
  CHART_ROW_MARGIN,
  chartGridProps,
  chartRowGridProps,
} from '@/lib/kit/charts/axis';

describe('CHART_CURSOR', () => {
  it('bands a hovered bar in accent at half strength, as ChartContainer does', () => {
    // --muted matches the dark panel, so a muted band vanished there.
    expect(CHART_CURSOR.bar).toEqual({
      fill: 'var(--accent)',
      fillOpacity: 0.5,
    });
  });

  it('draws a border-coloured rule on line charts', () => {
    expect(CHART_CURSOR.line).toEqual({
      stroke: 'var(--border)',
      strokeWidth: 1,
    });
  });
});

describe('row bar chart parts', () => {
  it('rounds the data end, which is on the right', () => {
    // Recharts reads radii as top-left, top-right, bottom-right, bottom-left.
    expect(CHART_ROW_BAR_RADIUS).toEqual([0, 4, 4, 0]);
    expect(CHART_BAR_RADIUS).toEqual([4, 4, 0, 0]);
  });

  it('draws the grid across the count axis, dashed like columns', () => {
    expect(chartRowGridProps).toEqual({
      strokeDasharray: chartGridProps.strokeDasharray,
      horizontal: false,
      vertical: true,
    });
  });

  it('leaves room on the right for the last count label', () => {
    expect(CHART_ROW_MARGIN.right).toBeGreaterThan(CHART_MARGIN.right);
    expect({ ...CHART_ROW_MARGIN, right: CHART_MARGIN.right }).toEqual(
      CHART_MARGIN
    );
  });
});
