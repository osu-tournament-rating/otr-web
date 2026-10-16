'use client';

import { Swords } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import {
  PanelSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import {
  HeroTabLabel,
  heroTabClassName,
  heroTabListClassName,
} from '@/components/kit/layout/HeroTabs';
import { parseMatchTab } from '@/components/matches/matchTabs';

import { GameFramesSkeleton, MatchStatsSkeleton } from './skeletons';

/*
 * The match loading screen's tab strip and body. A loading screen gets no
 * search params, so these read the address the visitor is going to: opening
 * the Stats tab shows the Stats skeleton under a selected Stats tab, not the
 * Games one.
 */

function useLoadingTab() {
  return parseMatchTab(useSearchParams().get('tab'));
}

/** The Games and Stats tabs, the one being opened underlined. */
export function MatchLoadingTabs() {
  const tab = useLoadingTab();

  return (
    <div className={heroTabListClassName} aria-hidden="true">
      <span
        className={heroTabClassName}
        aria-current={tab === 'games' ? 'page' : undefined}
      >
        <HeroTabLabel count={<SkeletonText className="h-3 w-4" />}>
          Games
        </HeroTabLabel>
      </span>
      <span
        className={heroTabClassName}
        aria-current={tab === 'stats' ? 'page' : undefined}
      >
        <HeroTabLabel>Stats</HeroTabLabel>
      </span>
    </div>
  );
}

/** The panels under the hero: game cards, or the Stats tab's panels. */
export function MatchLoadingBody() {
  const tab = useLoadingTab();

  if (tab === 'stats') {
    return <MatchStatsSkeleton />;
  }

  return (
    <PanelSkeleton>
      <SectionHeaderSkeleton icon={Swords} title="Games" meta="w-14" />
      <div className="p-4">
        <GameFramesSkeleton />
      </div>
    </PanelSkeleton>
  );
}
