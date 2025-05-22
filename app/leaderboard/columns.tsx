'use client';

import TierIcon from '@/components/icons/TierIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { TierName } from '@/lib/tierData';
import { PlayerRatingStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { createColumnHelper } from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';

const columnHelper = createColumnHelper<PlayerRatingStatsDTO>();

export const columns = [
  columnHelper.accessor('globalRank', {
    header: 'Rank',
    cell: ({ getValue, row }) => (
      <div className="flex min-w-[100px] flex-row items-center justify-between">
        <p>#{getValue()}</p>
        <div className="flex items-center">
          <Image
            src={`https://assets.ppy.sh/old-flags/${row.original.player.country}.png`}
            alt="avatar"
            className="p-1"
            width={32}
            height={22}
          />
          <p className="text-secondary-foreground w-6 self-end align-bottom text-xs">
            #{row.original.countryRank}
          </p>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('player.osuId', {
    header: 'Player',
    cell: ({ getValue, row }) => (
      <div className="flex min-w-[150px] flex-row items-center gap-2">
        <Image
          src={`https://a.ppy.sh/${getValue()}`}
          alt="avatar"
          className="flex-shrink-0 rounded-full"
          width={28}
          height={28}
        />
        <Link href={`/players/${row.original.player.id}`}>
          <p className="max-w-[120px] truncate sm:max-w-full">
            {row.original.player.username}
          </p>
        </Link>
      </div>
    ),
  }),
  // TODO: This columnHelper.accessor will never find the right tier icon
  // because it's searching for a tier like 'Silver' without the subtier.
  columnHelper.accessor('tierProgress.currentTier', {
    header: 'Tier',
    cell: ({ getValue }) => (
      <div className="flex justify-center">
        <TierIcon
          tier={(getValue() ?? 'Bronze I') as TierName}
          width={24}
          height={24}
        />
      </div>
    ),
  }),
  columnHelper.accessor('rating', {
    header: 'Rating',
    cell: ({ getValue }) => (
      <div className="flex min-w-[60px] justify-center">
        <SimpleTooltip content={`${getValue().toFixed(2)} TR`}>
          <p>{getValue().toFixed(0)}</p>
        </SimpleTooltip>
      </div>
    ),
  }),
  columnHelper.accessor('tournamentsPlayed', {
    header: 'Tournaments',
    cell: ({ getValue }) => (
      <p className="text-secondary-foreground text-center">{getValue()}</p>
    ),
  }),
  columnHelper.accessor('matchesPlayed', {
    header: 'Matches',
    cell: ({ getValue }) => (
      <p className="text-secondary-foreground text-center">{getValue()}</p>
    ),
  }),
  columnHelper.accessor('winRate', {
    header: 'Win %',
    cell: ({ getValue }) => (
      <p className="text-secondary-foreground text-center">
        {~~((getValue() ?? 0) * 100)}%
      </p>
    ),
  }),
];
