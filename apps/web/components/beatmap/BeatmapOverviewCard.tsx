import {
  ArrowUpRight,
  CalendarRange,
  Gamepad2,
  Gauge,
  SlidersHorizontal,
  TrendingUp,
  Trophy,
  WavesLadder,
} from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';

import {
  Eyebrow,
  SectionCard,
  SectionHeader,
  Tile,
  TileStat,
} from '@/components/beatmap/BeatmapSection';
import BeatmapPoolsDialog from '@/components/beatmap/BeatmapPoolsDialog';
import BeatmapUsageSparkline from '@/components/beatmap/BeatmapUsageSparkline';
import { Progress } from '@/components/ui/progress';
import { getBeatmapAttributeRows } from '@/lib/beatmaps/presentation';
import {
  getMostUsedInPool,
  getPoolPickRate,
  summarizeActivity,
} from '@/lib/beatmaps/records';
import type {
  BeatmapStatsSummary,
  BeatmapTournamentUsage,
  BeatmapUsagePoint,
  BeatmapWithDetails,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatChartNumber } from '@/lib/utils/chart';

const ATTRIBUTE_SCALE_MAX = 10;

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
    <SectionCard data-testid="beatmap-overview" className={className}>
      <SectionHeader icon={Gauge} title="Overview" />
      <AttributesGroup beatmap={beatmap} />
      <ActivityGroup usage={usage} summary={summary} pools={pools} />
    </SectionCard>
  );
}

/**
 * Tinted band that separates the card's two subjects. Lighter than
 * `SectionHeader` on purpose — these sit one level below the card title.
 */
function GroupHeader({
  icon: Icon,
  title,
  meta,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2 dark:bg-background/25">
      <h3 className="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{title}</span>
      </h3>
      {meta ? (
        <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
      ) : null}
    </div>
  );
}

/**
 * Two columns of spec-sheet tiles. Attributes that do not apply to the ruleset
 * are dimmed and drop their gauge, but keep a spacer so the grid rows stay
 * level.
 */
function AttributesGroup({ beatmap }: { beatmap: BeatmapWithDetails }) {
  const attributes = getBeatmapAttributeRows(beatmap.ruleset);

  return (
    <div data-testid="beatmap-attributes">
      <GroupHeader icon={SlidersHorizontal} title="Attributes" />
      <dl className="grid grid-cols-2 gap-2 px-4 py-3">
        {attributes.map((row) => {
          const value = beatmap[row.key];

          return (
            <Tile
              key={row.abbreviation}
              className={cn(row.muted && 'opacity-55')}
            >
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs font-medium text-muted-foreground">
                  <abbr title={row.label} className="cursor-help no-underline">
                    <span aria-hidden>{row.abbreviation}</span>
                    <span className="sr-only">{row.label}</span>
                  </abbr>
                </dt>
                <dd className="text-lg leading-none font-semibold">
                  {row.integer
                    ? Math.round(value).toString()
                    : value.toFixed(1)}
                </dd>
              </div>
              {row.gauge !== false ? (
                /* aria-hidden: the sibling `dd` already announces the value,
                   so a progressbar role would only say it twice. */
                <Progress
                  aria-hidden
                  value={Math.min(100, (value / ATTRIBUTE_SCALE_MAX) * 100)}
                  className="mt-2.5 h-1.5 bg-muted [&>[data-slot=progress-indicator]]:bg-foreground/60"
                />
              ) : (
                <span aria-hidden className="mt-2.5 block h-1.5" />
              )}
            </Tile>
          );
        })}
      </dl>
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

  // One source for both branches below: an e2e spec matches the accessible
  // name verbatim, and the drill-down must not change the tile at rest.
  const pooledIn = {
    icon: WavesLadder,
    label: 'Pooled in',
    sublabel: `${formatChartNumber(summary.verifiedTournamentCount)} verified`,
    value: formatChartNumber(summary.totalTournamentCount),
  };
  const pooledInAccessibleValue = `Pooled in ${formatChartNumber(summary.totalTournamentCount)} ${summary.totalTournamentCount === 1 ? 'tournament' : 'tournaments'}, ${formatChartNumber(summary.verifiedTournamentCount)} of them verified`;

  return (
    <div data-testid="beatmap-usage-chart" className="border-t">
      <GroupHeader icon={TrendingUp} title="Tournament activity" />

      <div className="space-y-3 px-4 py-3">
        <BeatmapUsageSparkline usage={usage} />

        <Tile>
          <Eyebrow>Most used in</Eyebrow>
          {mostUsedIn ? (
            <>
              <Link
                href={`/tournaments/${mostUsedIn.tournament.id}`}
                prefetch={false}
                className="mt-0.5 flex items-start gap-1 rounded-sm text-sm font-semibold hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span>{mostUsedIn.tournament.name}</span>
                <ArrowUpRight
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatChartNumber(mostUsedIn.scoreCount)} scores ·{' '}
                {formatChartNumber(mostUsedIn.gameCount)} games
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Never played in a verified match.
            </p>
          )}
        </Tile>

        {/* A <div>, not a <dl>: the "Pooled in" tile is a <button>, which
            HTML's description-list content model forbids. */}
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
              <TileStat {...pooledIn} />
            </BeatmapPoolsDialog>
          )}
          <ActivityStat
            testId="beatmap-played-tournaments"
            icon={Trophy}
            label="Pick rate"
            /* Split across value and sublabel — the combined string wraps and
               unbalances the tile row. */
            value={pickRate === null ? '—' : `${pickRate}%`}
            sublabel={
              pickRate === null
                ? undefined
                : `${formatChartNumber(summary.pooledPlayedTournamentCount)} of ${formatChartNumber(summary.totalTournamentCount)} pools`
            }
            accessibleValue={
              pickRate === null
                ? 'Never pooled, so no pick rate'
                : `Picked in ${formatChartNumber(summary.pooledPlayedTournamentCount)} of ${formatChartNumber(summary.totalTournamentCount)} pools, ${pickRate}%`
            }
          />
          <ActivityStat
            testId="beatmap-games"
            icon={Gamepad2}
            label="Games"
            sublabel={`${formatChartNumber(summary.totalGameCount)} verified`}
            value={formatChartNumber(summary.totalPlayedGameCount)}
            accessibleValue={`${formatChartNumber(summary.totalPlayedGameCount)} ${summary.totalPlayedGameCount === 1 ? 'game' : 'games'} played, ${formatChartNumber(summary.totalGameCount)} of them verified`}
          />
          <ActivityStat
            testId="beatmap-active-quarters"
            icon={CalendarRange}
            label="Quarters"
            sublabel="with activity"
            value={formatChartNumber(activity.activeQuarters)}
            accessibleValue={`${formatChartNumber(activity.activeQuarters)} active quarters`}
          />
        </div>
      </div>
    </div>
  );
}

function ActivityStat({
  testId,
  icon: Icon,
  label,
  sublabel,
  value,
  accessibleValue,
}: {
  testId: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  sublabel?: string;
  value: string;
  accessibleValue: string;
}) {
  return (
    <Tile data-testid={testId} aria-label={accessibleValue}>
      <TileStat icon={Icon} label={label} sublabel={sublabel} value={value} />
    </Tile>
  );
}
