'use client';

import { ChartColumn, Music, Swords, TrendingUp, Trophy } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import {
  PanelSkeleton,
  PhoneRowListSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
  StatTileGridSkeleton,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';
import {
  HeroTabLabel,
  heroTabClassName,
  heroTabCountsFromClassName,
  heroTabListClassName,
} from '@/components/kit/layout/HeroTabs';
import { PanelBody } from '@/components/kit/layout/Panel';
import { RowList, RowListItem } from '@/components/kit/layout/RowList';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import {
  DEFAULT_TOURNAMENT_TAB,
  TOURNAMENT_TABS,
  type TournamentTab,
} from '@/components/tournaments/tabs';
import { parseHeroTab } from '@/lib/kit/layout/hero-tabs';
import { cn } from '@/lib/utils';

/*
 * The tournament loading screen's tab strip and body. A loading screen gets
 * no search params, so these read the address the visitor is going to:
 * opening the Stats tab shows the Stats skeleton under a selected Stats tab,
 * not the Matches one.
 */

function useLoadingTab(): TournamentTab {
  return parseHeroTab(
    useSearchParams().get('tab') ?? undefined,
    TOURNAMENT_TABS,
    DEFAULT_TOURNAMENT_TAB
  );
}

/** A tab's count; the tabs show counts from `sm`, like the loaded ones. */
function TabCountSkeleton() {
  return <SkeletonText className="h-3 w-6" />;
}

const TAB_LABELS: Record<TournamentTab, string> = {
  matches: 'Matches',
  beatmaps: 'Beatmaps',
  ratings: 'Ratings',
  stats: 'Stats',
};

/** The four tabs, the one being opened underlined. */
export function TournamentLoadingTabs() {
  const tab = useLoadingTab();

  return (
    <div
      className={cn(heroTabListClassName, heroTabCountsFromClassName.sm)}
      aria-hidden="true"
    >
      {TOURNAMENT_TABS.map((value) => (
        <span
          key={value}
          className={heroTabClassName}
          aria-current={tab === value ? 'page' : undefined}
        >
          <HeroTabLabel
            count={
              value === 'matches' || value === 'beatmaps' ? (
                <TabCountSkeleton />
              ) : undefined
            }
          >
            {TAB_LABELS[value]}
          </HeroTabLabel>
        </span>
      ))}
    </div>
  );
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

function MatchesSkeleton() {
  return (
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
  );
}

/** The pool table's columns, as BeatmapListTable draws them. */
const POOL_COLUMNS = [
  { label: 'Beatmap' },
  { label: 'Mode', width: 'w-13' },
  { label: 'SR', width: 'w-22' },
  { label: 'BPM', width: 'w-17', align: 'end' },
  { label: 'Length', width: 'w-20', align: 'end' },
  { label: 'CS', width: 'w-15', align: 'end', showFrom: 'xl' },
  { label: 'AR', width: 'w-15', align: 'end', showFrom: 'xl' },
  { label: 'Games', width: 'w-20', align: 'end' },
  { label: 'Mods', width: 'w-34', showFrom: 'lg' },
] as const;

/**
 * The pool's phone rows: the beatmap list's cover rows (BeatmapListRows), a
 * cover over the title, difficulty, attribution and two lines of figures.
 */
function PoolPhoneRowsSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="grid gap-3 p-3">
          <SkeletonText className="block h-28 w-full rounded-lg" />
          <div className="flex flex-col">
            <SkeletonText className="h-5 w-3/4" />
            <SkeletonText className="mt-1 h-4 w-2/5" />
            <SkeletonText className="mt-1.5 h-3.5 w-3/5" />
            <SkeletonText className="mt-2 h-6 w-48" />
            <SkeletonText className="mt-1.5 h-5 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BeatmapsSkeleton() {
  return (
    <PanelSkeleton>
      <SectionHeaderSkeleton icon={Music} title="Pooled beatmaps" meta="w-24" />
      <TableSkeleton
        columns={POOL_COLUMNS}
        rows={10}
        cellHeight="h-10"
        phoneRows={<PoolPhoneRowsSkeleton />}
      />
    </PanelSkeleton>
  );
}

const RATING_COLUMNS = [
  { label: 'Player' },
  { label: 'Matches', align: 'end' },
  { label: 'Games', align: 'end', showFrom: 'lg' },
  { label: 'Before', align: 'end' },
  { label: 'After', align: 'end' },
  { label: 'Avg. change', align: 'end' },
  { label: 'Total change', align: 'end' },
] as const;

function RatingsSkeleton() {
  return (
    <PanelSkeleton>
      <SectionHeaderSkeleton
        icon={TrendingUp}
        title="Rating changes"
        meta="w-20"
        actions={1}
      />
      <TableSkeleton
        columns={RATING_COLUMNS}
        rows={10}
        phoneRows={<PhoneRowListSkeleton rows={8} leading={32} />}
      />
    </PanelSkeleton>
  );
}

const STAT_LABELS = [
  'Players',
  'Matches',
  'Games',
  'Duration',
  'Verified matches',
  'Peak day',
] as const;

const TOP_PERFORMER_COLUMNS = [
  { label: 'Rank', width: 'w-16' },
  { label: 'Player' },
  { label: 'Match cost', align: 'end' },
  { label: 'Avg. placement', align: 'end' },
  { label: 'Avg. games', align: 'end' },
  { label: 'Avg. rating change', align: 'end' },
] as const;

function StatsSkeleton() {
  return (
    <>
      <PanelSkeleton>
        <SectionHeaderSkeleton
          icon={ChartColumn}
          title="Tournament statistics"
          meta={false}
        />
        <PanelBody>
          <StatTileGridSkeleton labels={STAT_LABELS} columns={3} />
        </PanelBody>
      </PanelSkeleton>
      <PanelSkeleton>
        <SectionHeaderSkeleton
          icon={Trophy}
          title="Top performers"
          meta={false}
        />
        <TableSkeleton
          columns={TOP_PERFORMER_COLUMNS}
          rows={3}
          phoneRows={
            <PhoneRowListSkeleton rows={3} rank leading={32} valueDescription />
          }
        />
      </PanelSkeleton>
    </>
  );
}

/** The panels under the hero for the tab being opened. */
export function TournamentLoadingBody() {
  switch (useLoadingTab()) {
    case 'beatmaps':
      return <BeatmapsSkeleton />;
    case 'ratings':
      return <RatingsSkeleton />;
    case 'stats':
      return <StatsSkeleton />;
    default:
      return <MatchesSkeleton />;
  }
}
