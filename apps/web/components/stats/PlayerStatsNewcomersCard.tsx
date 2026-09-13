'use client';

import { UserPlus } from 'lucide-react';

import {
  EmptyState,
  Eyebrow,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import TierIcon from '@/components/icons/TierIcon';
import { StatPlayerLink } from '@/components/stats/PlayerStatsRow';
import StatsViewMoreDialog, {
  type StatsDialogColumn,
} from '@/components/stats/StatsViewMoreDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Ruleset } from '@otr/core/osu';
import type { PlayerStatsNewcomer } from '@otr/core/stats/player-stats';
import { cn } from '@/lib/utils';
import { formatChartNumber, formatRating } from '@/lib/utils/chart';
import { formatUTCDate } from '@/lib/utils/date';
import { getTierFromRating } from '@/lib/utils/tierData';

const VISIBLE_ROWS = 6;

const INFO =
  'Players whose first verified match was in the last 30 days. Newest first, then by osu! rank.';

/** Tier icon and rating in fixed slots, so a missing rating shifts nothing. */
function NewcomerRating({ rating }: { rating: number | null }) {
  const tier = rating === null ? null : getTierFromRating(rating);

  return (
    <span className="grid grid-cols-[20px_48px] items-center justify-items-end gap-1.5">
      <span className="flex size-5 items-center justify-center">
        {tier ? (
          <TierIcon
            tier={tier.tier}
            subTier={tier.subTier}
            width={20}
            height={20}
          />
        ) : null}
      </span>
      <span className="font-medium tabular-nums">
        {rating === null ? '' : formatRating(rating)}
      </span>
    </span>
  );
}

const columns: StatsDialogColumn<PlayerStatsNewcomer>[] = [
  {
    key: 'player',
    className: 'pl-4',
    header: 'Player',
    cell: (newcomer) => <StatPlayerLink player={newcomer} />,
  },
  {
    key: 'first',
    className: 'w-24',
    cellClassName: 'text-xs text-muted-foreground',
    header: 'First match',
    cell: (newcomer) => formatUTCDate(new Date(newcomer.firstMatch)),
  },
  {
    key: 'rating',
    className: 'w-25 text-right',
    header: 'Rating',
    cell: (newcomer) => <NewcomerRating rating={newcomer.rating} />,
  },
  {
    key: 'record',
    className: 'w-12 text-right',
    cellClassName: 'text-muted-foreground tabular-nums',
    header: 'Record',
    cell: (newcomer) => `${newcomer.wins}–${newcomer.losses}`,
  },
  {
    key: 'rank',
    className: 'w-22 pr-4 text-right',
    cellClassName: 'text-muted-foreground tabular-nums',
    header: 'osu! rank',
    cell: (newcomer) =>
      newcomer.osuGlobalRank === null
        ? ''
        : `#${formatChartNumber(newcomer.osuGlobalRank)}`,
  },
];

/** Players who played their first verified match recently. */
export default function PlayerStatsNewcomersCard({
  newcomers,
  ruleset,
}: {
  newcomers: readonly PlayerStatsNewcomer[];
  ruleset: Ruleset;
}) {
  return (
    <SectionCard className="flex flex-col" data-testid="stats-card-newcomers">
      <SectionHeader
        icon={UserPlus}
        title="Newcomers"
        infoText={INFO}
        meta="Last 30 days"
      />

      {newcomers.length === 0 ? (
        <EmptyState>No newcomers in the last 30 days.</EmptyState>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn('h-8', column.className)}
                >
                  <Eyebrow>{column.header}</Eyebrow>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {newcomers.slice(0, VISIBLE_ROWS).map((newcomer, index) => (
              <TableRow key={newcomer.id} className="hover:bg-muted/25">
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      'truncate',
                      column.className,
                      column.cellClassName
                    )}
                  >
                    {column.cell(newcomer, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {newcomers.length > VISIBLE_ROWS ? (
        <StatsViewMoreDialog
          title="Newcomers"
          description={INFO}
          ruleset={ruleset}
          items={newcomers}
          rowKey={(newcomer) => `${newcomer.id}`}
          data-testid="stats-dialog-newcomers"
          columns={columns}
        />
      ) : null}
    </SectionCard>
  );
}
