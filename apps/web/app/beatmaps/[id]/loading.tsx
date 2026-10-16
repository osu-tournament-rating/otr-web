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
  className,
}: {
  icon: KitIcon;
  title: string;
  className: string;
}) {
  return (
    <PanelSkeleton className={cn('flex flex-col', className)}>
      <SectionHeaderSkeleton icon={icon} title={title} />
      <div className="flex flex-1 p-4">
        <Block className="min-h-24 flex-1 rounded-lg" />
      </div>
    </PanelSkeleton>
  );
}

// Heights are the loaded panels' at 390px and 1440px wide, in page order.
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
        <PanelSkeleton className="flex h-[682px] flex-col">
          <SectionHeaderSkeleton
            icon={SlidersHorizontal}
            title="Attributes"
            meta={false}
          />
          <div className="grid grid-cols-2 gap-2 p-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Block key={index} className="h-[57px] rounded-lg" />
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
          className="h-[760px] lg:col-span-2 lg:h-[682px]"
        />
      </div>
      <ChartPanel
        icon={ChartCandlestick}
        title="Score distribution"
        className="h-[516px] xl:h-[359px]"
      />
      <ChartPanel
        icon={Medal}
        title="Tier breakdown"
        className="h-[580px] xl:h-[315px]"
      />
      <ChartPanel
        icon={ChartScatter}
        title="Score scatter"
        className="h-[427px]"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          icon={Swords}
          title="Game closeness"
          className="h-[371px] lg:h-[331px]"
        />
        <ChartPanel
          icon={Target}
          title="Misses"
          className="h-[223px] lg:h-[331px]"
        />
      </div>
      <ChartPanel
        icon={Medal}
        title="Leaderboard"
        className="h-[1525px] md:h-[1108px]"
      />
    </PageFrame>
  );
}
