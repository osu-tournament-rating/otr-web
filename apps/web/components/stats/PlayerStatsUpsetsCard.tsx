'use client';

import { Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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
import StatsSegmentedControl from '@/components/stats/StatsSegmentedControl';
import StatsViewMoreDialog from '@/components/stats/StatsViewMoreDialog';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import type { Ruleset } from '@otr/core/osu';
import type {
  PlayerStats,
  PlayerStatsUpset,
  PlayerStatsUpsetWindow,
} from '@otr/core/stats/player-stats';
import { formatRating } from '@/lib/utils/chart';
import { formatUTCDate } from '@/lib/utils/date';

const VISIBLE_ROWS = 5;

const INFO =
  'Verified 1v1 matches won by the lower-rated player. Ranked by the rating gap at the time of the match.';

const WINDOWS: { value: PlayerStatsUpsetWindow; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '3', label: '3 mo' },
  { value: '6', label: '6 mo' },
  { value: '12', label: '12 mo' },
];

const upsetKey = (upset: PlayerStatsUpset) =>
  `${upset.matchId}-${upset.winner.id}-${upset.loser.id}`;

function UpsetPlayer({ player }: { player: PlayerStatsUpset['winner'] }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <OsuAvatar osuId={player.osuId} username={player.username} size={24} />
      <StatPlayerName player={player} className="min-w-0 flex-1" />
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatRating(player.ratingBefore)}
      </span>
    </span>
  );
}

/** 1v1 wins over a higher-rated opponent, by rating gap. */
export default function PlayerStatsUpsetsCard({
  upsets,
  ruleset,
}: {
  upsets: PlayerStats['upsets'];
  ruleset: Ruleset;
}) {
  const [upsetWindow, setUpsetWindow] = useState<PlayerStatsUpsetWindow>('all');
  const rows = upsets[upsetWindow] ?? [];

  return (
    <SectionCard className="flex flex-col" data-testid="stats-card-upsets">
      <SectionHeader
        icon={Zap}
        title="Biggest 1v1 upsets"
        infoText={INFO}
        meta={
          <StatsSegmentedControl
            label="Upset window"
            value={upsetWindow}
            options={WINDOWS}
            onValueChange={setUpsetWindow}
            data-testid="stats-upsets-window"
          />
        }
      />

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <StatList>
          {rows.slice(0, VISIBLE_ROWS).map((upset) => (
            <StatRow key={upsetKey(upset)}>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="grid grid-cols-[24px_minmax(0,1fr)_40px] items-center gap-1.5 sm:grid-cols-[24px_minmax(0,1fr)_40px_32px_24px_minmax(0,1fr)_40px]">
                  <OsuAvatar
                    osuId={upset.winner.osuId}
                    username={upset.winner.username}
                    size={24}
                  />
                  <StatPlayerName player={upset.winner} />
                  <span className="text-right text-xs text-muted-foreground tabular-nums">
                    {formatRating(upset.winner.ratingBefore)}
                  </span>
                  <span className="col-span-3 text-center text-xs text-muted-foreground sm:col-span-1">
                    beat
                  </span>
                  <OsuAvatar
                    osuId={upset.loser.osuId}
                    username={upset.loser.username}
                    size={24}
                  />
                  <StatPlayerName player={upset.loser} />
                  <span className="text-right text-xs text-muted-foreground tabular-nums">
                    {formatRating(upset.loser.ratingBefore)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {formatUTCDate(new Date(upset.date))} ·{' '}
                  <span title={upset.tournament.name}>
                    {upset.tournament.abbreviation}
                  </span>{' '}
                  ·{' '}
                  <Link
                    href={`/matches/${upset.matchId}`}
                    prefetch={false}
                    className="text-primary hover:underline"
                  >
                    View match
                  </Link>
                </p>
              </div>
              <div className="w-16 shrink-0 text-right">
                <p className="text-lg leading-6 font-bold tabular-nums">
                  +{formatRating(upset.gap)}
                </p>
                <p className="text-xs text-muted-foreground">TR gap</p>
              </div>
            </StatRow>
          ))}
        </StatList>
      )}

      {rows.length > VISIBLE_ROWS ? (
        <StatsViewMoreDialog
          title="Biggest 1v1 upsets"
          description={INFO}
          ruleset={ruleset}
          items={rows}
          rowKey={upsetKey}
          data-testid="stats-dialog-upsets"
          columns={[
            {
              key: 'rank',
              className: 'w-11 pl-4',
              cellClassName: 'text-xs text-muted-foreground tabular-nums',
              header: '#',
              cell: (_upset, index) => index + 1,
            },
            {
              key: 'winner',
              header: 'Winner',
              cell: (upset) => <UpsetPlayer player={upset.winner} />,
            },
            {
              key: 'loser',
              header: 'Loser',
              cell: (upset) => <UpsetPlayer player={upset.loser} />,
            },
            {
              key: 'gap',
              className: 'w-16 text-right',
              cellClassName: 'font-semibold tabular-nums',
              header: 'Gap',
              cell: (upset) => `+${formatRating(upset.gap)}`,
            },
            {
              key: 'tournament',
              className: 'w-28',
              header: 'Tournament',
              cell: (upset) => (
                <Link
                  href={`/tournaments/${upset.tournament.id}`}
                  prefetch={false}
                  title={upset.tournament.name}
                  className="text-xs hover:underline"
                >
                  {upset.tournament.abbreviation}
                </Link>
              ),
            },
            {
              key: 'match',
              className: 'w-26 pr-4',
              header: 'Match',
              cell: (upset) => (
                <Link
                  href={`/matches/${upset.matchId}`}
                  prefetch={false}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {formatUTCDate(new Date(upset.date))}
                </Link>
              ),
            },
          ]}
        />
      ) : null}
    </SectionCard>
  );
}
