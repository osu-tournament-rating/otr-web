import {
  ChartPlotSkeleton,
  PanelSkeleton,
  RulesetSwitchSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { STATS_PANELS } from '@/components/stats/chart-panels';

import { StatsPageHeader } from './StatsPageHeader';

/** Each meta bar is as wide as the loaded count ("2,540 verified" is 80px). */
const CHART_PANELS = [
  { copy: STATS_PANELS.verification, metaWidth: 'w-28' },
  { copy: STATS_PANELS.year, metaWidth: 'w-20' },
  { copy: STATS_PANELS.ruleset, metaWidth: 'w-20' },
  { copy: STATS_PANELS.lobbySize, metaWidth: 'w-20' },
];

export default function StatsLoading() {
  return (
    <PageFrame role="status" aria-label="Loading statistics">
      <StatsPageHeader />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CHART_PANELS.map(({ copy, metaWidth }) => (
          <PanelSkeleton key={copy.title}>
            <SectionHeaderSkeleton {...copy} meta={metaWidth} />
            <div className="p-4">
              <ChartPlotSkeleton className="h-60" />
            </div>
          </PanelSkeleton>
        ))}
      </div>
      <PanelSkeleton>
        <SectionHeaderSkeleton
          {...STATS_PANELS.ratingDistribution}
          meta="w-22"
        />
        <div className="border-b px-4 py-3">
          <RulesetSwitchSkeleton />
        </div>
        <div className="flex flex-col gap-3 p-4">
          {/* The tier legend: one line on desktop, three on phones. */}
          <div className="flex h-14 items-start sm:h-4 sm:items-center">
            <SkeletonText className="h-3 w-full max-w-xl" />
          </div>
          <ChartPlotSkeleton className="h-72" />
        </div>
      </PanelSkeleton>
    </PageFrame>
  );
}
