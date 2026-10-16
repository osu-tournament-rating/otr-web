'use client';

import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { formatCount } from '@/lib/kit/format/number';

import { STATS_PANELS } from './chart-panels';
import { CountBarChart } from './CountBarChart';
import { getLobbySizeBars, sumCounts } from './stats-data';

export default function TournamentsByLobbySizeChart({
  data,
}: {
  data: Record<string, number>;
}) {
  const bars = getLobbySizeBars(data);
  const total = sumCounts(bars);

  return (
    <Panel data-testid="chart-tournaments-by-lobby-size">
      <SectionHeader
        {...STATS_PANELS.lobbySize}
        meta={total > 0 ? `${formatCount(total)} verified` : undefined}
      />
      {total === 0 ? (
        <EmptyState
          size="compact"
          icon={STATS_PANELS.lobbySize.icon}
          title="No verified tournaments yet"
        />
      ) : (
        <PanelBody>
          <CountBarChart data={bars} valueName="Tournaments" />
        </PanelBody>
      )}
    </Panel>
  );
}
