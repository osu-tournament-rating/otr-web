'use client';

import { Flag } from 'lucide-react';
import Link from 'next/link';

import {
  EmptyState,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import {
  StatList,
  StatPlayerLink,
  StatPlayerName,
  StatRow,
} from '@/components/stats/PlayerStatsRow';
import StatsViewMoreDialog from '@/components/stats/StatsViewMoreDialog';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import type { Ruleset } from '@otr/core/osu';
import type { PlayerStatsMilestone } from '@otr/core/stats/player-stats';
import { formatChartNumber } from '@/lib/utils/chart';
import { formatUTCDate } from '@/lib/utils/date';

const VISIBLE_ROWS = 6;

const INFO =
  'Recently reached round numbers of tournaments, matches, or games played: 10, 25, 50, 100, 250, 500, 1,000.';

const milestoneKey = (milestone: PlayerStatsMilestone) =>
  `${milestone.id}-${milestone.kind}-${milestone.count}`;

function MatchDate({ milestone }: { milestone: PlayerStatsMilestone }) {
  return (
    <>
      {formatUTCDate(new Date(milestone.date))} ·{' '}
      <Link
        href={`/matches/${milestone.matchId}`}
        prefetch={false}
        className="text-primary hover:underline"
      >
        View match
      </Link>
    </>
  );
}

/** Round numbers of tournaments, matches, or games reached recently. */
export default function PlayerStatsMilestonesCard({
  milestones,
  ruleset,
}: {
  milestones: readonly PlayerStatsMilestone[];
  ruleset: Ruleset;
}) {
  return (
    <SectionCard className="flex flex-col" data-testid="stats-card-milestones">
      <SectionHeader
        icon={Flag}
        title="Milestones"
        infoText={INFO}
        meta="Last 30 days"
      />

      {milestones.length === 0 ? (
        <EmptyState>No milestones in the last 30 days.</EmptyState>
      ) : (
        <StatList>
          {milestones.slice(0, VISIBLE_ROWS).map((milestone) => (
            <StatRow key={milestoneKey(milestone)}>
              <OsuAvatar
                osuId={milestone.osuId}
                username={milestone.username}
                size={32}
                className="shrink-0 sm:hidden"
              />
              <OsuAvatar
                osuId={milestone.osuId}
                username={milestone.username}
                size={24}
                className="hidden shrink-0 sm:block"
              />
              <div className="min-w-0 flex-1">
                <StatPlayerName player={milestone} />
                <p className="truncate text-xs text-muted-foreground sm:hidden">
                  <MatchDate milestone={milestone} />
                </p>
              </div>
              <span className="hidden w-40 shrink-0 truncate text-right text-xs text-muted-foreground sm:block">
                <MatchDate milestone={milestone} />
              </span>
              <span className="grid shrink-0 grid-cols-[56px_80px] items-baseline gap-1">
                <span className="text-right text-lg leading-6 font-bold tabular-nums">
                  {formatChartNumber(milestone.count)}
                </span>
                <span className="text-left text-xs text-muted-foreground">
                  {milestone.kind}
                </span>
              </span>
            </StatRow>
          ))}
        </StatList>
      )}

      {milestones.length > VISIBLE_ROWS ? (
        <StatsViewMoreDialog
          title="Milestones"
          description={INFO}
          ruleset={ruleset}
          items={milestones}
          rowKey={milestoneKey}
          data-testid="stats-dialog-milestones"
          columns={[
            {
              key: 'player',
              className: 'pl-4',
              header: 'Player',
              cell: (milestone) => <StatPlayerLink player={milestone} />,
            },
            {
              key: 'count',
              className: 'w-20 text-right',
              cellClassName: 'font-semibold tabular-nums',
              header: 'Reached',
              cell: (milestone) => formatChartNumber(milestone.count),
            },
            {
              key: 'kind',
              className: 'w-28',
              cellClassName: 'text-muted-foreground',
              header: 'Milestone',
              cell: (milestone) => milestone.kind,
            },
            {
              key: 'date',
              className: 'w-26',
              cellClassName: 'text-xs text-muted-foreground',
              header: 'Date',
              cell: (milestone) => formatUTCDate(new Date(milestone.date)),
            },
            {
              key: 'match',
              className: 'w-26 pr-4',
              header: 'Match',
              cell: (milestone) => (
                <Link
                  href={`/matches/${milestone.matchId}`}
                  prefetch={false}
                  className="text-xs text-primary hover:underline"
                >
                  View match
                </Link>
              ),
            },
          ]}
        />
      ) : null}
    </SectionCard>
  );
}
