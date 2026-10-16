import {
  PanelSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import {
  STATS_PANELS,
  type StatsPanelCopy,
} from '@/components/stats/chart-panels';
import { RATED_RULESETS } from '@/lib/kit/format/ruleset';
import { cn } from '@/lib/utils';

import { StatsPageHeader } from './StatsPageHeader';

/**
 * The real section header with a bar for its count, about as wide as the
 * loaded count, so headers wrap on phones just as they will once loaded.
 */
function PanelHeaderSkeleton({
  copy,
  metaWidth,
}: {
  copy: StatsPanelCopy;
  metaWidth: string;
}) {
  return (
    <SectionHeader
      {...copy}
      meta={<SkeletonText className={cn('h-3', metaWidth)} />}
    />
  );
}

/** The plot area of a chart while it loads, as tall as the loaded plot. */
function PlotSkeleton({ className }: { className: string }) {
  return (
    <span
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'block w-full animate-pulse rounded-lg bg-accent',
        className
      )}
    />
  );
}

const CHART_PANELS = [
  { copy: STATS_PANELS.verification, metaWidth: 'w-28' },
  { copy: STATS_PANELS.year, metaWidth: 'w-24' },
  { copy: STATS_PANELS.ruleset, metaWidth: 'w-24' },
  { copy: STATS_PANELS.lobbySize, metaWidth: 'w-24' },
];

export default function StatsLoading() {
  return (
    <PageFrame role="status" aria-label="Loading statistics">
      <StatsPageHeader />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CHART_PANELS.map(({ copy, metaWidth }) => (
          <PanelSkeleton key={copy.title}>
            <PanelHeaderSkeleton copy={copy} metaWidth={metaWidth} />
            <div className="p-4">
              <PlotSkeleton className="h-60" />
            </div>
          </PanelSkeleton>
        ))}
      </div>
      <PanelSkeleton>
        <PanelHeaderSkeleton
          copy={STATS_PANELS.ratingDistribution}
          metaWidth="w-24"
        />
        <div className="flex flex-wrap gap-1.5 border-b px-4 py-3">
          {RATED_RULESETS.map((ruleset) => (
            <SkeletonText key={ruleset} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="flex flex-col gap-3 p-4">
          {/* The tier legend: one line on desktop, three on phones. */}
          <div className="flex h-14 items-start sm:h-4 sm:items-center">
            <SkeletonText className="h-3 w-full max-w-xl" />
          </div>
          <PlotSkeleton className="h-72" />
        </div>
      </PanelSkeleton>
    </PageFrame>
  );
}
