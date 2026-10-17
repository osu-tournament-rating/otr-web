'use client';

import { CountBarChart } from '@/components/kit/charts/CountBarChart';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { formatCount, formatPercent } from '@/lib/kit/format/number';
import type { VerificationStatusKey } from '@/lib/orpc/schema/stats';

import { STATS_PANELS } from './chart-panels';
import { getVerificationBars, sumCounts } from './stats-data';

/**
 * Every tournament by verification status. Pending, Pre-verified and
 * Pre-rejected share one "Not in ratings yet" bar, as everywhere else.
 */
export default function TournamentVerificationChart({
  verificationCounts,
}: {
  verificationCounts: Partial<Record<VerificationStatusKey, number>>;
}) {
  const bars = getVerificationBars(verificationCounts);
  const total = sumCounts(bars);

  return (
    <Panel data-testid="chart-tournament-verification">
      <SectionHeader
        {...STATS_PANELS.verification}
        meta={total > 0 ? `${formatCount(total)} tournaments` : undefined}
      />
      {total === 0 ? (
        <EmptyState
          size="compact"
          icon={STATS_PANELS.verification.icon}
          title="No verification data"
        />
      ) : (
        <PanelBody>
          <CountBarChart
            data={bars}
            layout="rows"
            valueName="Tournaments"
            footer={(bar) =>
              `${formatPercent(bar.count / total)} of all tournaments`
            }
          />
        </PanelBody>
      )}
    </Panel>
  );
}
