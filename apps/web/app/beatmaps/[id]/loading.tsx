import {
  ChartCandlestick,
  ChartScatter,
  ListFilter,
  Medal,
  SlidersHorizontal,
  Swords,
  Target,
  TrendingUp,
} from 'lucide-react';
import type * as React from 'react';

import {
  GAME_CLOSENESS_INFO,
  SCORE_DISTRIBUTION_INFO,
  TIER_BREAKDOWN_INFO,
} from '@/components/beatmap/section-info';
import {
  PanelSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { Panel } from '@/components/kit/layout/Panel';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/** A bar that fills its box. */
function Block({ className }: { className?: string }) {
  return <SkeletonText className={cn('block h-auto w-auto', className)} />;
}

/** A panel with its real header strip and a body as tall as the loaded one. */
function ChartPanel({
  icon,
  title,
  infoText,
  meta,
  className,
}: {
  icon: KitIcon;
  title: string;
  /** The loaded header's info text. */
  infoText?: React.ReactNode;
  /** The loaded meta's width class, or false when the header has none. */
  meta: string | false;
  className: string;
}) {
  return (
    <PanelSkeleton className={cn('flex flex-col', className)}>
      <SectionHeaderSkeleton
        icon={icon}
        title={title}
        infoText={infoText}
        meta={meta}
      />
      <div className="flex flex-1 p-4">
        <Block className="min-h-24 flex-1 rounded-lg" />
      </div>
    </PanelSkeleton>
  );
}

// Heights are the loaded panels' at 390px and 1440px wide, in page order.
// Meta widths are the loaded counts', such as "272 of 272 scores rated", so
// the Game closeness strip wraps on a phone as the loaded one does.
export default function BeatmapDetailLoading() {
  return (
    <PageFrame role="status" aria-label="Loading beatmap">
      {/* The hero: art, the essentials row and the difficulty picker */}
      <Panel as="div" className="divide-y">
        <Block className="h-48 rounded-none sm:h-56" />
        <div className="flex items-center gap-2 p-4">
          <Block className="h-8 w-20 rounded-full" />
          <Block className="h-8 w-20 rounded-full" />
          <Block className="h-5 w-32" />
          <Block className="ml-auto size-9" />
        </div>
        <div className="flex gap-2 p-4 pt-3">
          <Block className="h-10 w-48 sm:size-10" />
          <Block className="h-10 w-48 sm:size-10" />
          <Block className="h-10 w-48 sm:size-10" />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <PanelSkeleton className="flex h-[680px] flex-col">
          <SectionHeaderSkeleton
            icon={SlidersHorizontal}
            title="Attributes"
            meta={false}
          />
          <div className="grid grid-cols-2 gap-2 p-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Block key={index} className="h-14 rounded-lg" />
            ))}
          </div>
          <div className="border-t">
            <SectionHeaderSkeleton
              icon={TrendingUp}
              title="Tournament activity"
              meta={false}
            />
          </div>
          <div className="flex min-h-0 flex-1 p-4">
            <Block className="flex-1 rounded-lg" />
          </div>
        </PanelSkeleton>
        <ChartPanel
          icon={ListFilter}
          title="Distributions"
          meta={false}
          className="h-[760px] lg:col-span-2 lg:h-[680px]"
        />
      </div>
      <ChartPanel
        icon={ChartCandlestick}
        title="Score distribution"
        infoText={SCORE_DISTRIBUTION_INFO}
        meta="w-16"
        className="h-[516px] xl:h-[359px]"
      />
      <ChartPanel
        icon={Medal}
        title="Tier breakdown"
        infoText={TIER_BREAKDOWN_INFO}
        meta="w-34"
        className="h-[580px] xl:h-[315px]"
      />
      <ChartPanel
        icon={ChartScatter}
        title="Score scatter"
        meta="w-16"
        className="h-[427px]"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          icon={Swords}
          title="Game closeness"
          infoText={GAME_CLOSENESS_INFO}
          meta="w-48"
          className="h-[371px] lg:h-[331px]"
        />
        <ChartPanel
          icon={Target}
          title="Misses"
          meta="w-16"
          className="h-[223px] lg:h-[331px]"
        />
      </div>
      <ChartPanel
        icon={Medal}
        title="Leaderboard"
        meta="w-32"
        className="h-[1525px] md:h-[1108px]"
      />
    </PageFrame>
  );
}
