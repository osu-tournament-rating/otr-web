'use client';

import { CountBarChart } from '@/components/kit/charts/CountBarChart';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { formatYearTick } from '@/lib/kit/charts/format';
import {
  DEFAULT_MAX_TICKS,
  NARROW_MAX_TICKS,
  getCategoryTicks,
} from '@/lib/kit/charts/ticks';
import { formatCount } from '@/lib/kit/format/number';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';

import { STATS_PANELS } from './chart-panels';
import { getYearBars, sumCounts } from './stats-data';

export default function TournamentsByYearChart({
  data,
}: {
  data: Record<string, number>;
}) {
  const maxTicks = useIsNarrowChart() ? NARROW_MAX_TICKS : DEFAULT_MAX_TICKS;
  const bars = getYearBars(data);
  const total = sumCounts(bars);
  // Years are categories: tick round years inside the data, by the one rule.
  const yearTicks = getCategoryTicks(
    bars.map((bar) => Number(bar.key)),
    maxTicks
  ).map(formatYearTick);

  return (
    <Panel data-testid="chart-tournaments-by-year">
      <SectionHeader
        {...STATS_PANELS.year}
        meta={total > 0 ? `${formatCount(total)} verified` : undefined}
      />
      {total === 0 ? (
        <EmptyState
          size="compact"
          icon={STATS_PANELS.year.icon}
          title="No verified tournaments yet"
        />
      ) : (
        <PanelBody>
          <CountBarChart
            data={bars}
            valueName="Tournaments"
            categoryTicks={yearTicks}
          />
        </PanelBody>
      )}
    </Panel>
  );
}
