import { ChartLine, Swords } from 'lucide-react';

import {
  PanelSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { DetailHero } from '@/components/kit/layout/DetailHero';
import {
  HeroTabLabel,
  heroTabClassName,
  heroTabListClassName,
} from '@/components/kit/layout/HeroTabs';
import { PageFrame } from '@/components/kit/layout/PageFrame';

import { GameFramesSkeleton } from './skeletons';

export default function MatchLoading() {
  return (
    <PageFrame role="status" aria-label="Loading match">
      <DetailHero
        title={<SkeletonText className="h-7 w-80 max-w-full" />}
        status={<SkeletonText className="h-6 w-24 rounded-full" />}
        meta={
          <>
            <SkeletonText className="w-44" />
            <SkeletonText className="w-48" />
            <SkeletonText className="w-20" />
          </>
        }
        actions={
          <>
            <SkeletonText className="size-8" />
            <SkeletonText className="size-8" />
            <SkeletonText className="size-8" />
          </>
        }
        tabs={
          <div className={heroTabListClassName} aria-hidden="true">
            <span className={heroTabClassName} aria-current="page">
              <HeroTabLabel icon={Swords}>Games</HeroTabLabel>
            </span>
            <span className={heroTabClassName}>
              <HeroTabLabel icon={ChartLine}>Stats</HeroTabLabel>
            </span>
          </div>
        }
      />
      <PanelSkeleton>
        <SectionHeaderSkeleton icon={Swords} title="Games" meta="w-14" />
        <div className="p-4">
          <GameFramesSkeleton />
        </div>
      </PanelSkeleton>
    </PageFrame>
  );
}
