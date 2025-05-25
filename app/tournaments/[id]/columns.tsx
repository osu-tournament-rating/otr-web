'use client';

import VerificationBadge from '@/components/badges/VerificationBadge';
import WarningFlagsBadge from '@/components/badges/WarningFlagsBadge';
import {
  GameDTO,
  GameWarningFlags,
  MatchWarningFlags,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import { createColumnHelper } from '@tanstack/react-table';
import Link from 'next/link';

export type MatchRow = {
  id: number;
  name: string;
  status: {
    verificationStatus: VerificationStatus;
    warningFlags: MatchWarningFlags;
  };
  startDate: string;
  games: Pick<
    GameDTO,
    'verificationStatus' | 'warningFlags' | 'startTime' | 'rejectionReason'
  >[];
};

const columnHelper = createColumnHelper<MatchRow>();

export const columns = [
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => (
      <div className="-mr-3 flex gap-1">
        <VerificationBadge 
          verificationStatus={getValue().verificationStatus}
          warningFlags={getValue().warningFlags}
          entityType="match"
        />
        <WarningFlagsBadge itemType={'match'} value={getValue().warningFlags} />
      </div>
    ),
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: ({ getValue, row }) => (
      <div className="max-w-[500px] text-wrap">
        <Link
          href={`/matches/${row.original.id}`}
          className="break-words hover:underline"
        >
          {getValue()}
        </Link>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'pips',
    header: 'Games',
    cell: ({ row }) => {
      const games = row.original.games;
      // Sort games by start time before rendering pips
      const sortedGames = [...games].sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      return (
        <div className="flex max-w-[200px] flex-wrap gap-1">
          {sortedGames.map((game, index) => (
            <VerificationBadge
              key={index}
              verificationStatus={game.verificationStatus}
              warningFlags={game.warningFlags}
              rejectionReason={game.rejectionReason}
              entityType="game"
              gameIndex={index}
              size="small"
              minimal
            />
          ))}
        </div>
      );
    },
  }),
  columnHelper.accessor('startDate', {
    header: 'Start Date',
    cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
  }),
];
