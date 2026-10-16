'use client';

import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { formatCount } from '@/lib/kit/format/number';

import { STATS_PANELS } from './chart-panels';
import { CountBarChart } from './CountBarChart';
import { getRulesetBars, sumCounts } from './stats-data';

export default function TournamentsByRulesetChart({
  data,
}: {
  data: Record<string, number>;
}) {
  const bars = getRulesetBars(data);
  const total = sumCounts(bars);

  return (
    <Panel data-testid="chart-tournaments-by-ruleset">
      <SectionHeader
        {...STATS_PANELS.ruleset}
        meta={total > 0 ? `${formatCount(total)} verified` : undefined}
      />
      {total === 0 ? (
        <EmptyState
          size="compact"
          icon={STATS_PANELS.ruleset.icon}
          title="No verified tournaments yet"
        />
      ) : (
        <PanelBody>
          <CountBarChart data={bars} layout="rows" valueName="Tournaments" />
        </PanelBody>
      )}
    </Panel>
  );
}
