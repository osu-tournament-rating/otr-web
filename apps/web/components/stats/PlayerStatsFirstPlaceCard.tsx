'use client';

import { Crown } from 'lucide-react';
import { useState } from 'react';

import {
  EmptyState,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import {
  StatList,
  StatPlayerLink,
  StatPlayerName,
  StatRank,
  StatRow,
} from '@/components/stats/PlayerStatsRow';
import StatsSegmentedControl from '@/components/stats/StatsSegmentedControl';
import StatsViewMoreDialog, {
  rankColumn,
} from '@/components/stats/StatsViewMoreDialog';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import type { Ruleset } from '@otr/core/osu';
import type {
  PlayerStats,
  PlayerStatsFirstPlace,
  PlayerStatsTeamSize,
} from '@otr/core/stats/player-stats';
import { formatChartNumber, formatPercentage } from '@/lib/utils/chart';

const VISIBLE_ROWS = 5;

const INFO =
  'Share of verified games finished in first place. Players with at least 10 matches and 35 games in this ruleset.';

const TEAM_SIZES: { value: PlayerStatsTeamSize; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '1', label: '1v1' },
  { value: '2', label: '2v2' },
  { value: '3', label: '3v3' },
  { value: '4', label: '4v4' },
];

const rate = (entry: PlayerStatsFirstPlace) =>
  formatPercentage((entry.wins / entry.games) * 100, 1);

const played = (entry: PlayerStatsFirstPlace) =>
  `${formatChartNumber(entry.wins)} / ${formatChartNumber(entry.games)} games`;

/** Players who win the most verified games outright, by lobby size. */
export default function PlayerStatsFirstPlaceCard({
  firstPlace,
  ruleset,
}: {
  firstPlace: PlayerStats['firstPlace'];
  ruleset: Ruleset;
}) {
  const [teamSize, setTeamSize] = useState<PlayerStatsTeamSize>('all');
  const rows = firstPlace[teamSize] ?? [];

  return (
    <SectionCard className="flex flex-col" data-testid="stats-card-first-place">
      <SectionHeader
        icon={Crown}
        title="Highest first place rate"
        infoText={INFO}
        meta={
          <StatsSegmentedControl
            label="Team size"
            value={teamSize}
            options={TEAM_SIZES}
            onValueChange={setTeamSize}
            data-testid="stats-first-place-size"
          />
        }
      />

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <StatList>
          {rows.slice(0, VISIBLE_ROWS).map((entry, index) => (
            <StatRow key={entry.id}>
              <StatRank rank={index + 1} />
              <OsuAvatar
                osuId={entry.osuId}
                username={entry.username}
                size={24}
                className="shrink-0"
              />
              <StatPlayerName player={entry} className="min-w-0 flex-1" />
              <span className="w-26 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {played(entry)}
              </span>
              <span className="w-15 shrink-0 text-right text-lg leading-6 font-bold tabular-nums">
                {rate(entry)}
              </span>
            </StatRow>
          ))}
        </StatList>
      )}

      {rows.length > VISIBLE_ROWS ? (
        <StatsViewMoreDialog
          title="Highest first place rate"
          description={INFO}
          ruleset={ruleset}
          items={rows}
          rowKey={(entry) => `${entry.id}`}
          data-testid="stats-dialog-first-place"
          columns={[
            rankColumn,
            {
              key: 'player',
              header: 'Player',
              cell: (entry) => <StatPlayerLink player={entry} />,
            },
            {
              key: 'wins',
              className: 'w-20 text-right',
              cellClassName: 'text-muted-foreground tabular-nums',
              header: 'First',
              cell: (entry) => formatChartNumber(entry.wins),
            },
            {
              key: 'games',
              className: 'w-20 text-right',
              cellClassName: 'text-muted-foreground tabular-nums',
              header: 'Games',
              cell: (entry) => formatChartNumber(entry.games),
            },
            {
              key: 'rate',
              className: 'w-20 pr-4 text-right',
              cellClassName: 'font-semibold tabular-nums',
              header: 'Rate',
              cell: rate,
            },
          ]}
        />
      ) : null}
    </SectionCard>
  );
}
