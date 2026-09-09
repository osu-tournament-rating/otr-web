import type * as React from 'react';

import {
  EmptyState,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import {
  StatList,
  StatPlayerName,
  StatPlayerTier,
  StatRank,
  StatRow,
  StatValue,
} from '@/components/stats/PlayerStatsRow';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import type { PlayerStatsLeader } from '@otr/core/stats/player-stats';
import { formatChartNumber } from '@/lib/utils/chart';

/** The leader with its value, then the runners-up as compact rows. */
export function LeaderList({
  leaders,
  unit,
}: {
  leaders: readonly PlayerStatsLeader[];
  unit: string;
}) {
  const [leader, ...rest] = leaders;

  if (!leader) {
    return <EmptyState />;
  }

  return (
    <StatList>
      <StatRow className="py-2.5">
        <OsuAvatar
          osuId={leader.osuId}
          username={leader.username}
          size={40}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <StatPlayerName player={leader} className="text-base" />
          <StatPlayerTier rating={leader.rating} />
        </div>
        <div className="w-24 shrink-0 text-right">
          <p className="text-2xl leading-7 font-bold tabular-nums">
            {formatChartNumber(leader.value)}
          </p>
          <p className="truncate text-xs text-muted-foreground">{unit}</p>
        </div>
      </StatRow>
      {rest.map((entry, index) => (
        <StatRow key={`${entry.id}-${index}`}>
          <StatRank rank={index + 2} />
          <OsuAvatar
            osuId={entry.osuId}
            username={entry.username}
            size={24}
            className="shrink-0"
          />
          <StatPlayerName player={entry} className="min-w-0 flex-1" />
          <StatValue value={entry.value} className="w-24" />
        </StatRow>
      ))}
    </StatList>
  );
}

/** Most tournaments, matches, or games played in the selected ruleset. */
export default function PlayerStatsLeaderCard({
  icon,
  title,
  infoText,
  unit,
  leaders,
  meta,
  'data-testid': testId,
}: {
  icon: React.ComponentProps<typeof SectionHeader>['icon'];
  title: string;
  infoText: string;
  unit: string;
  leaders: readonly PlayerStatsLeader[];
  meta?: React.ReactNode;
  'data-testid'?: string;
}) {
  return (
    <SectionCard className="flex flex-col" data-testid={testId}>
      <SectionHeader
        icon={icon}
        title={title}
        infoText={infoText}
        meta={meta}
      />
      <LeaderList leaders={leaders} unit={unit} />
    </SectionCard>
  );
}
