'use client';

import { Activity } from 'lucide-react';

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
  StatValue,
} from '@/components/stats/PlayerStatsRow';
import StatsViewMoreDialog, {
  rankColumn,
} from '@/components/stats/StatsViewMoreDialog';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import type { Ruleset } from '@otr/core/osu';
import type { PlayerStatsActive } from '@otr/core/stats/player-stats';
import { formatChartNumber } from '@/lib/utils/chart';

const VISIBLE_ROWS = 6;

const INFO = 'Verified matches played in the last 6 months.';

/** Players with the most verified matches in the recent window. */
export default function PlayerStatsActiveCard({
  active,
  ruleset,
}: {
  active: readonly PlayerStatsActive[];
  ruleset: Ruleset;
}) {
  return (
    <SectionCard className="flex flex-col" data-testid="stats-card-active">
      <SectionHeader
        icon={Activity}
        title="Most active"
        infoText={INFO}
        meta="Matches · last 6 months"
      />

      {active.length === 0 ? (
        <EmptyState />
      ) : (
        <StatList>
          {active.slice(0, VISIBLE_ROWS).map((entry, index) => (
            <StatRow key={entry.id}>
              <StatRank rank={index + 1} />
              <OsuAvatar
                osuId={entry.osuId}
                username={entry.username}
                size={24}
                className="shrink-0"
              />
              <StatPlayerName player={entry} className="min-w-0 flex-1" />
              <span className="w-25 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {formatChartNumber(entry.tournaments)} tournaments
              </span>
              <StatValue value={entry.matches} className="w-12" />
            </StatRow>
          ))}
        </StatList>
      )}

      {active.length > VISIBLE_ROWS ? (
        <StatsViewMoreDialog
          title="Most active"
          description={INFO}
          ruleset={ruleset}
          items={active}
          rowKey={(entry) => `${entry.id}`}
          data-testid="stats-dialog-active"
          columns={[
            rankColumn,
            {
              key: 'player',
              header: 'Player',
              cell: (entry) => <StatPlayerLink player={entry} />,
            },
            {
              key: 'tournaments',
              className: 'w-26 text-right',
              cellClassName: 'text-muted-foreground tabular-nums',
              header: 'Tournaments',
              cell: (entry) => formatChartNumber(entry.tournaments),
            },
            {
              key: 'matches',
              className: 'w-24 pr-4 text-right',
              cellClassName: 'font-semibold tabular-nums',
              header: 'Matches',
              cell: (entry) => formatChartNumber(entry.matches),
            },
          ]}
        />
      ) : null}
    </SectionCard>
  );
}
