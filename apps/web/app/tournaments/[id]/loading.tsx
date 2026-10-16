import { Swords } from 'lucide-react';

import {
  PanelSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { DetailHero } from '@/components/kit/layout/DetailHero';
import {
  HeroTabLabel,
  heroTabClassName,
  heroTabListClassName,
} from '@/components/kit/layout/HeroTabs';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { RowList, RowListItem } from '@/components/kit/layout/RowList';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';

/** A tab's count, shown from `sm` like the loaded tabs' counts. */
function TabCountSkeleton() {
  return <SkeletonText className="hidden h-3 w-6 sm:inline-block" />;
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
          <div className={heroTabListClassName} aria-hidden="true">
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
        {/* The sort control's bars, 40px tall like the loaded strip. */}
        <SectionHeader
          icon={Swords}
          title="Matches"
          actions={
            <span className="flex gap-2">
              <SkeletonText className="block h-10 w-44 md:w-48" />
              <SkeletonText className="block size-10" />
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
