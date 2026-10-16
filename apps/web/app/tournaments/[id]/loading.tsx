import { Swords } from 'lucide-react';

import {
  PanelSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { DetailHero } from '@/components/kit/layout/DetailHero';
import {
  HeroTabLabel,
  heroTabClassName,
  heroTabCountsFromClassName,
  heroTabListClassName,
} from '@/components/kit/layout/HeroTabs';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { RowList, RowListItem } from '@/components/kit/layout/RowList';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { cn } from '@/lib/utils';

/** A tab's count; the tabs show counts from `sm`, like the loaded ones. */
function TabCountSkeleton() {
  return <SkeletonText className="h-3 w-6" />;
}

/** A match row while it loads: result, name, status, games and time. */
function MatchRowSkeleton() {
  return (
    <RowListItem className="py-2">
      <div className="flex h-6 items-center gap-3">
        <SkeletonText className="h-6 w-14" />
        <SkeletonText className="w-56 max-w-[40%]" />
        <SkeletonText className="ml-auto size-4 rounded-full lg:ml-0" />
        <SkeletonText className="hidden w-72 lg:ml-auto lg:block" />
        <SkeletonText className="hidden h-3 w-36 lg:block" />
      </div>
    </RowListItem>
  );
}

export default function TournamentLoading() {
  return (
    <PageFrame role="status" aria-label="Loading tournament">
      <DetailHero
        title={<SkeletonText className="h-7 w-80 max-w-full" />}
        status={<SkeletonText className="h-6 w-24 rounded-full" />}
        meta={
          <>
            <SkeletonText className="w-14" />
            <SkeletonText className="w-10" />
            <SkeletonText className="w-20" />
            <SkeletonText className="w-40" />
          </>
        }
        actions={
          <>
            <SkeletonText className="size-8" />
            <SkeletonText className="size-8" />
          </>
        }
        tabs={
          <div
            className={cn(heroTabListClassName, heroTabCountsFromClassName.sm)}
            aria-hidden="true"
          >
            <span className={heroTabClassName} aria-current="page">
              <HeroTabLabel count={<TabCountSkeleton />}>Matches</HeroTabLabel>
            </span>
            <span className={heroTabClassName}>
              <HeroTabLabel count={<TabCountSkeleton />}>Beatmaps</HeroTabLabel>
            </span>
            <span className={heroTabClassName}>
              <HeroTabLabel>Ratings</HeroTabLabel>
            </span>
            <span className={heroTabClassName}>
              <HeroTabLabel>Stats</HeroTabLabel>
            </span>
          </div>
        }
      />
      <PanelSkeleton>
        {/* The small sort control's bars, 32px tall like the loaded ones. */}
        <SectionHeader
          icon={Swords}
          title="Matches"
          actions={
            <span className="flex w-52 gap-2 md:w-auto">
              <SkeletonText className="block h-8 flex-1 md:w-40 md:flex-none" />
              <SkeletonText className="block size-8" />
            </span>
          }
        />
        <RowList aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <MatchRowSkeleton key={index} />
          ))}
        </RowList>
      </PanelSkeleton>
    </PageFrame>
  );
}
