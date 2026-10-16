import { describe, expect, it } from 'bun:test';

import { CHART_CURSOR } from '@/lib/kit/charts/axis';

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
