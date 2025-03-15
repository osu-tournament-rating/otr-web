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
      <div className="flex flex-row gap-2">
        <Image
          src={`https://assets.ppy.sh/old-flags/${row.original.player.country}.png`}
          alt="avatar"
          className="p-1"
          width={40}
          height={28}
        />
        <Image
          src={`https://a.ppy.sh/${getValue()}`}
          alt="avatar"
          className="rounded-full"
          width={28}
          height={28}
        />
        <Link href={`/players/${getValue()}`}>
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
];
