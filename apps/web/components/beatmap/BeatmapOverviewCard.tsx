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
} from '@/components/beatmap/BeatmapSection';
import { getBeatmapAttributeRows } from '@/lib/beatmaps/presentation';
import {
  formatQuarterLong,
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
      <h3 className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{title}</span>
      </h3>
      {meta ? (
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

/** The shared tile chrome behind both stat grids. */
function Tile({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg border bg-muted/25 px-3 py-2.5', className)}
      {...props}
    />
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
                <span
                  aria-hidden
                  className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full bg-foreground/60"
                    style={{
                      width: `${Math.min(100, (value / ATTRIBUTE_SCALE_MAX) * 100)}%`,
                    }}
                  />
                </span>
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

  return (
    <div data-testid="beatmap-usage-chart" className="border-t">
      <GroupHeader icon={TrendingUp} title="Tournament activity" />

      <div className="space-y-3 px-4 py-3">
        {/* A run of empty quarters is not a chart — pooled-but-never-played
            maps skip the sparkline rather than draw a blank frame. */}
        {usage.length >= 2 && activity.maxGames > 0 && (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <Eyebrow>Games per quarter</Eyebrow>
              <span className="text-[11px] text-muted-foreground">
                {`peak ${activity.maxGames.toLocaleString()}`}
              </span>
            </div>
            <div className="mt-2 flex h-20 gap-px" aria-hidden>
              {usage.map((point) => (
                <div
                  key={point.quarter}
                  /* Two populations in one tooltip: bar height is verified
                     games, pool records count every tournament. Say which is
                     which rather than letting them read as one series. */
                  title={`${formatQuarterLong(point.quarter)} · ${point.gameCount} verified games, ${point.pooledCount} pool records`}
                  className="group flex min-w-0 flex-1 flex-col justify-end gap-px rounded-t-[3px] hover:bg-primary/10"
                >
                  <div
                    className="w-full rounded-t-[2px] bg-primary/85 transition-colors group-hover:bg-primary"
                    style={{
                      // Guarded above: this only renders when maxGames > 0.
                      height: `${(point.gameCount / activity.maxGames) * 100}%`,
                      minHeight: point.gameCount > 0 ? 2 : 0,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between border-t pt-1 text-[11px] text-muted-foreground">
              <span>
                {activity.firstActive
                  ? formatQuarterLong(activity.firstActive.quarter)
                  : '—'}
              </span>
              <span>
                {activity.lastActive
                  ? formatQuarterLong(activity.lastActive.quarter)
                  : '—'}
              </span>
            </div>
          </div>
        )}

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
                {mostUsedIn.scoreCount.toLocaleString()} scores ·{' '}
                {mostUsedIn.gameCount.toLocaleString()} games
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Never played in a verified match.
            </p>
          )}
        </Tile>

        <dl className="grid grid-cols-2 gap-2">
          <ActivityStat
            testId="beatmap-pool-records"
            icon={WavesLadder}
            label="Pooled in"
            sublabel={`${summary.verifiedTournamentCount.toLocaleString()} verified`}
            value={summary.totalTournamentCount.toLocaleString()}
            accessibleValue={`Pooled in ${summary.totalTournamentCount.toLocaleString()} ${summary.totalTournamentCount === 1 ? 'tournament' : 'tournaments'}, ${summary.verifiedTournamentCount.toLocaleString()} of them verified`}
          />
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
                : `${summary.pooledPlayedTournamentCount.toLocaleString()} of ${summary.totalTournamentCount.toLocaleString()} pools`
            }
            accessibleValue={
              pickRate === null
                ? 'Never pooled, so no pick rate'
                : `Picked in ${summary.pooledPlayedTournamentCount.toLocaleString()} of ${summary.totalTournamentCount.toLocaleString()} pools, ${pickRate}%`
            }
          />
          <ActivityStat
            testId="beatmap-games"
            icon={Gamepad2}
            label="Games"
            sublabel={`${summary.totalGameCount.toLocaleString()} verified`}
            value={summary.totalPlayedGameCount.toLocaleString()}
            accessibleValue={`${summary.totalPlayedGameCount.toLocaleString()} ${summary.totalPlayedGameCount === 1 ? 'game' : 'games'} played, ${summary.totalGameCount.toLocaleString()} of them verified`}
          />
          <ActivityStat
            testId="beatmap-active-quarters"
            icon={CalendarRange}
            label="Quarters"
            sublabel="with activity"
            value={activity.activeQuarters.toLocaleString()}
            accessibleValue={`${activity.activeQuarters.toLocaleString()} active quarters`}
          />
        </dl>
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
      <dt className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-1 text-xl leading-none font-bold">
        {value}
        {sublabel ? (
          <span className="mt-0.5 block text-xs leading-tight font-normal text-muted-foreground">
            {sublabel}
          </span>
        ) : null}
      </dd>
    </Tile>
  );
}
