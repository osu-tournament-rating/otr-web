import {
  ArrowUpRight,
  CalendarRange,
  Gamepad2,
  TrendingUp,
  Trophy,
  WavesLadder,
} from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';

import {
  Eyebrow,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
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
} from '@/lib/orpc/schema/beatmapStats';

export default function BeatmapActivityCard({
  data,
  summary,
  pools,
}: {
  data: BeatmapUsagePoint[];
  summary: BeatmapStatsSummary;
  pools: BeatmapTournamentUsage[];
}) {
  const activity = summarizeActivity(data);
  const mostUsedIn = getMostUsedInPool(pools);
  const pickRate = getPoolPickRate(
    summary.pooledPlayedTournamentCount,
    summary.totalTournamentCount
  );

  return (
    <SectionCard data-testid="beatmap-usage-chart">
      <SectionHeader icon={TrendingUp} title="Tournament activity" />

      {data.length >= 2 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex h-24 gap-px" aria-hidden>
            {data.map((point) => (
              <div
                key={point.quarter}
                title={`${formatQuarterLong(point.quarter)} · ${point.gameCount} games, ${point.pooledCount} pool records`}
                className="flex min-w-0 flex-1 flex-col justify-end gap-px"
              >
                <div
                  className="w-full rounded-t-[2px] bg-primary"
                  style={{
                    height:
                      activity.maxGames > 0
                        ? `${(point.gameCount / activity.maxGames) * 100}%`
                        : '0%',
                    minHeight: point.gameCount > 0 ? 2 : 0,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between border-t pt-1 font-mono text-[10px] text-muted-foreground tabular-nums">
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

      <div className="border-t px-4 py-3">
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
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              {mostUsedIn.scoreCount.toLocaleString()} scores ·{' '}
              {mostUsedIn.gameCount.toLocaleString()} games
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground">
            Never played in a verified match.
          </p>
        )}
      </div>

      <dl className="divide-y border-t">
        <ActivityStat
          testId="beatmap-pool-records"
          icon={WavesLadder}
          label="Pooled in"
          value={summary.totalTournamentCount.toLocaleString()}
          accessibleValue={`Pooled in ${summary.totalTournamentCount.toLocaleString()} tournaments`}
        />
        <ActivityStat
          testId="beatmap-played-tournaments"
          icon={Trophy}
          label="Pick rate"
          value={
            pickRate === null
              ? '—'
              : `${summary.pooledPlayedTournamentCount.toLocaleString()} (${pickRate}%)`
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
          value={summary.totalPlayedGameCount.toLocaleString()}
          accessibleValue={`${summary.totalPlayedGameCount.toLocaleString()} games played`}
        />
        <ActivityStat
          testId="beatmap-active-quarters"
          icon={CalendarRange}
          label="Active quarters"
          value={activity.activeQuarters.toLocaleString()}
          accessibleValue={`${activity.activeQuarters.toLocaleString()} active quarters`}
        />
      </dl>
    </SectionCard>
  );
}

function ActivityStat({
  testId,
  icon: Icon,
  label,
  value,
  accessibleValue,
}: {
  testId: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: string;
  accessibleValue: string;
}) {
  return (
    <div
      data-testid={testId}
      aria-label={accessibleValue}
      className="flex items-center justify-between gap-3 px-4 py-2"
    >
      <dt className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="shrink-0 font-mono text-sm font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}
