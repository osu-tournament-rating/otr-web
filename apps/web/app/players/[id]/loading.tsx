import {
  ChartBarBig,
  ChartLine,
  ChartNoAxesColumnIncreasing,
  ChartPie,
  Swords,
  Users,
} from 'lucide-react';

import {
  PanelSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
  StatTileGridSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { DetailHero } from '@/components/kit/layout/DetailHero';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PanelBody } from '@/components/kit/layout/Panel';
import {
  PlayerBeatmapsSkeleton,
  PlayerTournamentsSkeleton,
} from '@/components/player/PlayerSectionSkeletons';
import { RATED_RULESETS } from '@/lib/kit/format/ruleset';

const STAT_LABELS = [
  'Rating',
  'Percentile',
  'Global rank',
  'Country rank',
  'Tournaments',
  'Matches',
] as const;

// The chart panels below the rating history, in page order. The mod charts
// grow with the number of mods; this is a typical player's.
const CHART_PANELS = [
  { icon: ChartBarBig, title: 'Mod performance', plot: 'h-44' },
  { icon: ChartPie, title: 'Mod distribution', plot: 'h-72 md:h-44' },
  { icon: Users, title: 'Frequent teammates', plot: 'h-72' },
  { icon: Swords, title: 'Frequent opponents', plot: 'h-72' },
] as const;

export default function PlayerLoading() {
  return (
    <PageFrame role="status" aria-label="Loading player">
      <DetailHero
        leading={<SkeletonText className="block size-16 rounded-full" />}
        title={<SkeletonText className="h-7 w-44" />}
        meta={<SkeletonText className="h-4 w-28" />}
        actions={<SkeletonText className="block size-8" />}
      >
        <div className="flex flex-wrap gap-1.5 px-4 py-3 sm:px-6">
          {RATED_RULESETS.map((ruleset) => (
            <SkeletonText key={ruleset} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </DetailHero>

      <PanelSkeleton>
        <SectionHeaderSkeleton
          icon={ChartNoAxesColumnIncreasing}
          title="Rating"
          meta={false}
        />
        <PanelBody className="flex flex-col gap-4">
          <StatTileGridSkeleton
            labels={STAT_LABELS}
            columns={3}
            className="lg:grid-cols-6"
          />
          {/* The tier progress strip. */}
          <SkeletonText className="block h-15 w-full" />
        </PanelBody>
      </PanelSkeleton>

      <PanelSkeleton>
        <SectionHeaderSkeleton icon={ChartLine} title="Rating history" />
        <PanelBody className="flex flex-col gap-3">
          <SkeletonText className="block h-8 w-full max-w-md" />
          <SkeletonText className="block h-80 w-full rounded-lg" />
        </PanelBody>
      </PanelSkeleton>

      <div className="grid gap-4 md:grid-cols-2">
        {CHART_PANELS.map((panel) => (
          <PanelSkeleton key={panel.title}>
            <SectionHeaderSkeleton
              icon={panel.icon}
              title={panel.title}
              meta={false}
            />
            <PanelBody>
              <SkeletonText
                className={`block w-full rounded-lg ${panel.plot}`}
              />
            </PanelBody>
          </PanelSkeleton>
        ))}
      </div>

      <PlayerTournamentsSkeleton />
      <PlayerBeatmapsSkeleton />
    </PageFrame>
  );
}
