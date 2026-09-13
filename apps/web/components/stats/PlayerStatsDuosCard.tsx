'use client';

import { Users } from 'lucide-react';

import {
  EmptyState,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import {
  StatList,
  StatPlayerName,
  StatRow,
} from '@/components/stats/PlayerStatsRow';
import StatsViewMoreDialog, {
  rankColumn,
} from '@/components/stats/StatsViewMoreDialog';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import type { Ruleset } from '@otr/core/osu';
import type { PlayerStatsDuo } from '@otr/core/stats/player-stats';
import { formatChartNumber } from '@/lib/utils/chart';
import { formatUTCDate } from '@/lib/utils/date';

const VISIBLE_ROWS = 5;

const INFO =
  'Pairs that played on the same team in verified games. Ordered by games together.';

const duoKey = (duo: PlayerStatsDuo) =>
  `${duo.players[0].id}-${duo.players[1].id}`;

function DuoAvatars({ duo, size }: { duo: PlayerStatsDuo; size: number }) {
  return (
    <span className="flex shrink-0 items-center">
      <OsuAvatar
        osuId={duo.players[0].osuId}
        username={duo.players[0].username}
        size={size}
      />
      <OsuAvatar
        osuId={duo.players[1].osuId}
        username={duo.players[1].username}
        size={size}
        className="-ml-2 ring-2 ring-card"
      />
    </span>
  );
}

function DuoNames({ duo }: { duo: PlayerStatsDuo }) {
  return (
    <span className="flex min-w-0 items-center gap-1 text-sm">
      <StatPlayerName player={duo.players[0]} />
      <span className="shrink-0 text-muted-foreground">&amp;</span>
      <StatPlayerName player={duo.players[1]} />
    </span>
  );
}

const played = (duo: PlayerStatsDuo) =>
  `${formatUTCDate(new Date(duo.firstGame))} – ${formatUTCDate(new Date(duo.lastGame))}`;

const together = (duo: PlayerStatsDuo) =>
  `${formatChartNumber(duo.matches)} matches · ${formatChartNumber(duo.tournaments)} tournaments`;

/** Pairs who played the most verified games on the same team. */
export default function PlayerStatsDuosCard({
  duos,
  ruleset,
}: {
  duos: readonly PlayerStatsDuo[];
  ruleset: Ruleset;
}) {
  return (
    <SectionCard className="flex flex-col" data-testid="stats-card-duos">
      <SectionHeader
        icon={Users}
        title="Established duos"
        infoText={INFO}
        meta="By games together"
      />

      {duos.length === 0 ? (
        <EmptyState />
      ) : (
        <StatList>
          {duos.slice(0, VISIBLE_ROWS).map((duo) => (
            <StatRow key={duoKey(duo)}>
              <DuoAvatars duo={duo} size={32} />
              <div className="min-w-0 flex-1">
                <DuoNames duo={duo} />
                <p className="truncate text-xs text-muted-foreground">
                  {played(duo)}
                </p>
                <p className="truncate text-xs text-muted-foreground sm:hidden">
                  {together(duo)}
                </p>
              </div>
              <div className="w-14 shrink-0 text-right sm:w-46">
                <p>
                  <span className="text-lg leading-6 font-bold tabular-nums">
                    {formatChartNumber(duo.games)}
                  </span>{' '}
                  <span className="block text-xs text-muted-foreground sm:inline">
                    games
                  </span>
                </p>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  {together(duo)}
                </p>
              </div>
            </StatRow>
          ))}
        </StatList>
      )}

      {duos.length > VISIBLE_ROWS ? (
        <StatsViewMoreDialog
          title="Established duos"
          description={INFO}
          ruleset={ruleset}
          items={duos}
          rowKey={duoKey}
          data-testid="stats-dialog-duos"
          columns={[
            rankColumn,
            {
              key: 'players',
              header: 'Players',
              cell: (duo) => (
                <span className="flex min-w-0 items-center gap-2">
                  <DuoAvatars duo={duo} size={24} />
                  <DuoNames duo={duo} />
                </span>
              ),
            },
            {
              key: 'games',
              className: 'w-18 text-right',
              cellClassName: 'font-semibold tabular-nums',
              header: 'Games',
              cell: (duo) => formatChartNumber(duo.games),
            },
            {
              key: 'matches',
              className: 'w-20 text-right',
              cellClassName: 'text-muted-foreground tabular-nums',
              header: 'Matches',
              cell: (duo) => formatChartNumber(duo.matches),
            },
            {
              key: 'tournaments',
              className: 'w-26 text-right',
              cellClassName: 'text-muted-foreground tabular-nums',
              header: 'Tournaments',
              cell: (duo) => formatChartNumber(duo.tournaments),
            },
            {
              key: 'first',
              className: 'w-26',
              cellClassName: 'text-xs text-muted-foreground',
              header: 'First game',
              cell: (duo) => formatUTCDate(new Date(duo.firstGame)),
            },
            {
              key: 'last',
              className: 'w-28 pr-4',
              cellClassName: 'text-xs text-muted-foreground',
              header: 'Last game',
              cell: (duo) => formatUTCDate(new Date(duo.lastGame)),
            },
          ]}
        />
      ) : null}
    </SectionCard>
  );
}
