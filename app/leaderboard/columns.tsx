'use client';

import TierIcon from '@/components/icons/TierIcon';
import { PlayerRatingStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { createColumnHelper } from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';

const columnHelper = createColumnHelper<PlayerRatingStatsDTO>();

export const columns = [
  columnHelper.accessor('globalRank', {
    header: 'Rank',
    cell: ({ getValue }) => <p className="font-sans">#{getValue()}</p>,
  }),
  columnHelper.accessor('player.osuId', {
    header: 'Player',
    cell: ({ getValue, row }) => (
      <div className="flex flex-row gap-2 font-sans">
        <div className="flex flex-row gap-1">
          <p className="self-end align-bottom text-xs text-secondary-foreground">
            #{row.original.countryRank}
          </p>
          <Image
            src={`https://assets.ppy.sh/old-flags/${row.original.player.country}.png`}
            alt="avatar"
            className="p-1"
            width={40}
            height={28}
          />
        </div>

        <Image
          src={`https://a.ppy.sh/${getValue()}`}
          alt="avatar"
          className="rounded-full"
          width={28}
          height={28}
        />
        <Link href={`/players/${row.original.player.id}`}>
          <p className="font-sans">{row.original.player.username}</p>
        </Link>
      </div>
    ),
  }),
  columnHelper.accessor('currentTier', {
    header: 'Tier',
    cell: ({ getValue }) => (
      <TierIcon tier={getValue() ?? ''} width={24} height={24} />
    ),
  }),
  columnHelper.accessor('rating', {
    header: 'Rating',
    cell: ({ getValue }) => <p className="font-sans">{~~getValue()}</p>,
  }),
  columnHelper.accessor('tournamentsPlayed', {
    header: 'Tournaments',
    cell: ({ getValue }) => (
      <p className="font-sans text-secondary-foreground">{getValue()}</p>
    ),
  }),
  columnHelper.accessor('matchesPlayed', {
    header: 'Matches',
    cell: ({ getValue }) => (
      <p className="font-sans text-secondary-foreground">{getValue()}</p>
    ),
  }),
  columnHelper.accessor('winRate', {
    header: 'Win %',
    cell: ({ getValue }) => (
      <p className="font-sans text-secondary-foreground">
        {~~((getValue() ?? 0) * 100)}%
      </p>
    ),
  }),
];
