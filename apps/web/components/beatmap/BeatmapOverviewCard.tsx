import {
  ArrowUpRight,
  CalendarRange,
  Gamepad2,
  SlidersHorizontal,
  TrendingUp,
  Trophy,
  WavesLadder,
} from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';

import BeatmapPoolsDialog from '@/components/beatmap/BeatmapPoolsDialog';
import BeatmapUsageSparkline from '@/components/beatmap/BeatmapUsageSparkline';
import { Abbreviation } from '@/components/kit/layout/Abbreviation';
import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { StatTile, StatTileGrid } from '@/components/kit/layout/StatTile';
import { Tile } from '@/components/kit/layout/Tile';
import { Eyebrow } from '@/components/kit/layout/Typography';
import { MissingValue } from '@/components/kit/tables/MissingValue';
import { Progress } from '@/components/ui/progress';
import { getBeatmapAttributeRows } from '@/lib/beatmaps/presentation';
import {
  getMostUsedInPool,
  getPoolPickRate,
  summarizeActivity,
} from '@/lib/beatmaps/records';
import {
  formatCount,
  formatCountOf,
  formatNumber,
} from '@/lib/kit/format/number';
import type { KitIcon } from '@/lib/kit/layout/icon';
import type {
  BeatmapStatsSummary,
  BeatmapTournamentUsage,
  BeatmapUsagePoint,
  BeatmapWithDetails,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';

const ATTRIBUTE_SCALE_MAX = 10;

/** The rail beside the distributions: attributes, then tournament activity. */
export default function BeatmapOverviewCard({
  beatmap,
  usage,
  summary,
  pools,
  className,
}: {
  beatmap: BeatmapWithDetails;
  usage: BeatmapUsagePoint[];
  summary: BeatmapStatsSummary;
  pools: BeatmapTournamentUsage[];
  className?: string;
}) {
  return (
    <Panel data-testid="beatmap-overview" className={className}>
      <AttributesGroup beatmap={beatmap} />
      <ActivityGroup usage={usage} summary={summary} pools={pools} />
    </Panel>
  );
}

function AttributesGroup({ beatmap }: { beatmap: BeatmapWithDetails }) {
  const attributes = getBeatmapAttributeRows(beatmap.ruleset);

  return (
    <div data-testid="beatmap-attributes">
      <SectionHeader icon={SlidersHorizontal} title="Attributes" />
      <StatTileGrid columns={2} className="p-4">
        {attributes.map((row) => {
          const value = beatmap[row.key];

          return (
            <StatTile
              key={row.abbreviation}
              layout="inline"
              label={
                <Abbreviation full={row.label}>{row.abbreviation}</Abbreviation>
              }
              value={
                row.integer
                  ? formatCount(value)
                  : formatNumber(value, { decimals: 1 })
              }
              className={cn(row.muted && 'opacity-55')}
            >
              {row.gauge !== false ? (
                <Progress
                  aria-hidden
                  value={Math.min(100, (value / ATTRIBUTE_SCALE_MAX) * 100)}
                  className="mt-2.5 h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-foreground/60"
                />
              ) : (
                <span aria-hidden className="mt-2.5 block h-1.5" />
              )}
            </StatTile>
          );
        })}
      </StatTileGrid>
    </div>
  );
}

function ActivityGroup({
  usage,
  summary,
  pools,
}: {
  usage: BeatmapUsagePoint[];
  summary: BeatmapStatsSummary;
  pools: BeatmapTournamentUsage[];
}) {
  const activity = summarizeActivity(usage);
  const mostUsedIn = getMostUsedInPool(pools);
  const pickRate = getPoolPickRate(
    summary.pooledPlayedTournamentCount,
    summary.totalTournamentCount
  );

  // One source for both branches; an e2e spec matches the accessible name verbatim.
  const pooledIn = {
    icon: WavesLadder,
    label: 'Pooled in',
    sub: `${formatCount(summary.verifiedTournamentCount)} verified`,
    value: formatCount(summary.totalTournamentCount),
  };
  const pooledInAccessibleValue = `Pooled in ${formatCount(summary.totalTournamentCount)} ${summary.totalTournamentCount === 1 ? 'tournament' : 'tournaments'}, ${formatCount(summary.verifiedTournamentCount)} of them verified`;

  return (
    <div data-testid="beatmap-usage-chart" className="border-t">
      <SectionHeader icon={TrendingUp} title="Tournament activity" />

      <div className="space-y-3 p-4">
        <BeatmapUsageSparkline usage={usage} />

        <Tile>
          <Eyebrow className="block">Most used in</Eyebrow>
          {mostUsedIn ? (
            <>
              <Link
                href={`/tournaments/${mostUsedIn.tournament.id}`}
                prefetch={false}
                className="mt-0.5 flex items-start gap-1 rounded-sm text-sm font-semibold transition-colors hover:text-link focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span>{mostUsedIn.tournament.name}</span>
                <ArrowUpRight
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
              <p className="text-xs text-muted-foreground tabular-nums">
                {`${formatCountOf(mostUsedIn.scoreCount, 'score')} · ${formatCountOf(mostUsedIn.gameCount, 'game')}`}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Never played in a verified match.
            </p>
          )}
        </Tile>

        {/* A <div>, not a <dl>: the "Pooled in" tile is a <button> */}
        <div className="grid grid-cols-2 gap-2">
          {pools.length === 0 ? (
            <ActivityStat
              testId="beatmap-pool-records"
              {...pooledIn}
              accessibleValue={pooledInAccessibleValue}
            />
          ) : (
            <BeatmapPoolsDialog
              pools={pools}
              accessibleValue={pooledInAccessibleValue}
            >
              <ActivityStatContent {...pooledIn} />
            </BeatmapPoolsDialog>
          )}
          <ActivityStat
            testId="beatmap-played-tournaments"
            icon={Trophy}
            label="Pick rate"
            value={pickRate === null ? <MissingValue /> : `${pickRate}%`}
            sub={
              pickRate === null
                ? undefined
                : `${formatCount(summary.pooledPlayedTournamentCount)} of ${formatCountOf(summary.totalTournamentCount, 'pool')}`
            }
            accessibleValue={
              pickRate === null
                ? 'Never pooled, so no pick rate'
                : `Picked in ${formatCount(summary.pooledPlayedTournamentCount)} of ${formatCountOf(summary.totalTournamentCount, 'pool')}, ${pickRate}%`
            }
          />
          <ActivityStat
            testId="beatmap-games"
            icon={Gamepad2}
            label="Games"
            sub={`${formatCount(summary.totalGameCount)} verified`}
            value={formatCount(summary.totalPlayedGameCount)}
            accessibleValue={`${formatCount(summary.totalPlayedGameCount)} ${summary.totalPlayedGameCount === 1 ? 'game' : 'games'} played, ${formatCount(summary.totalGameCount)} of them verified`}
          />
          <ActivityStat
            testId="beatmap-active-quarters"
            icon={CalendarRange}
            label="Quarters"
            sub="with activity"
            value={formatCount(activity.activeQuarters)}
            accessibleValue={`${formatCount(activity.activeQuarters)} active quarters`}
          />
        </div>
      </div>
    </div>
  );
}

type ActivityStatProps = {
  icon: KitIcon;
  label: string;
  value: React.ReactNode;
  sub?: string;
};

/**
 * A StatTile's label, value and sub line as plain spans, so the "Pooled in"
 * tile can be a button (StatTile renders `dt` and `dd`).
 */
function ActivityStatContent({
  icon: Icon,
  label,
  value,
  sub,
}: ActivityStatProps) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-1 block text-xl leading-none font-bold tabular-nums">
        {value}
        {sub ? (
          <span className="mt-0.5 block text-xs leading-tight font-normal text-muted-foreground">
            {sub}
          </span>
        ) : null}
      </span>
    </>
  );
}

function ActivityStat({
  testId,
  accessibleValue,
  ...stat
}: ActivityStatProps & {
  testId: string;
  accessibleValue: string;
}) {
  return (
    <Tile data-testid={testId} role="group" aria-label={accessibleValue}>
      <ActivityStatContent {...stat} />
    </Tile>
  );
}
