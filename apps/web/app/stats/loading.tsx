import {
  PanelSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { STATS_PANELS } from '@/components/stats/chart-panels';
import { RATED_RULESETS } from '@/lib/kit/format/ruleset';
import { cn } from '@/lib/utils';

import { StatsPageHeader } from './StatsPageHeader';

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

/**
 * The loaded RulesetSwitch chips' widths, in RATED_RULESETS order (osu!,
 * taiko, catch, mania 4K, mania 7K), so the blocks wrap like the chips.
 */
const RULESET_CHIP_WIDTHS = ['w-18', 'w-19', 'w-20', 'w-27', 'w-27'] as const;

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
              <PlotSkeleton className="h-60" />
            </div>
          </PanelSkeleton>
        ))}
      </div>
      <PanelSkeleton>
        <SectionHeaderSkeleton
          {...STATS_PANELS.ratingDistribution}
          meta="w-22"
        />
        <div className="flex flex-wrap gap-1.5 border-b px-4 py-3">
          {RATED_RULESETS.map((ruleset, index) => (
            <SkeletonText
              key={ruleset}
              className={cn('h-8 rounded-full', RULESET_CHIP_WIDTHS[index])}
            />
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
