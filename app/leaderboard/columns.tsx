'use client';

import TierIcon from '@/components/icons/TierIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { PlayerRatingStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { createColumnHelper } from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';

const columnHelper = createColumnHelper<PlayerRatingStatsDTO>();

export const columns = [
  columnHelper.accessor('globalRank', {
    header: 'Rank',
    cell: ({ getValue, row }) => (
      <div className="flex min-w-[90px] flex-row items-center justify-between">
        <p className="font-sans">#{getValue()}</p>
        <div className="flex items-center">
          <Image
            src={`https://assets.ppy.sh/old-flags/${row.original.player.country}.png`}
            alt="avatar"
            className="p-1"
            width={32}
            height={22}
          />
          <p className="w-6 self-end align-bottom text-xs text-secondary-foreground">
            #{row.original.countryRank}
          </p>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('player.osuId', {
    header: 'Player',
    cell: ({ getValue, row }) => (
      <div className="flex min-w-[150px] flex-row items-center gap-2 font-sans">
        <Image
          src={`https://a.ppy.sh/${getValue()}`}
          alt="avatar"
          className="flex-shrink-0 rounded-full"
          width={28}
          height={28}
        />
        <Link href={`/players/${row.original.player.id}`}>
          <p className="max-w-[120px] truncate font-sans sm:max-w-full">
            {row.original.player.username}
          </p>
        </Link>
      </div>
    ),
  }),
  columnHelper.accessor('currentTier', {
    header: 'Tier',
    cell: ({ getValue }) => (
      <div className="flex justify-center">
        <TierIcon tier={getValue() ?? ''} width={24} height={24} />
      </div>
    ),
  }),
  columnHelper.accessor('rating', {
    header: 'Rating',
    cell: ({ getValue }) => (
      <div className="flex min-w-[60px] justify-center">
        <SimpleTooltip content={`${getValue().toFixed(2)} TR`}>
          <p className="font-sans">{getValue().toFixed(0)}</p>
        </SimpleTooltip>
      </div>
    ),
  }),
  columnHelper.accessor('tournamentsPlayed', {
    header: 'Tournaments',
    cell: ({ getValue }) => (
      <p className="text-center font-sans text-secondary-foreground">
        {getValue()}
      </p>
    ),
  }),
  columnHelper.accessor('matchesPlayed', {
    header: 'Matches',
    cell: ({ getValue }) => (
      <p className="text-center font-sans text-secondary-foreground">
        {getValue()}
      </p>
    ),
  }),
  columnHelper.accessor('winRate', {
    header: 'Win %',
    cell: ({ getValue }) => (
      <p className="text-center font-sans text-secondary-foreground">
        {~~((getValue() ?? 0) * 100)}%
      </p>
    ),
  }),
];
