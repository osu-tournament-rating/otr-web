'use client';

import VerificationBadge from '@/components/badges/VerificationBadge';
import {
  MatchWarningFlags,
  VerificationStatus,
  MatchRejectionReason,
} from '@otr/core/osu';
import { createColumnHelper } from '@tanstack/react-table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatUTCDateFull } from '@/lib/utils/date';
import { TournamentMatchGame } from '@/lib/orpc/schema/tournament';

export type MatchRow = {
  id: number;
  name: string;
  status: {
    verificationStatus: VerificationStatus;
    warningFlags: MatchWarningFlags;
    rejectionReason: MatchRejectionReason;
  };
  startDate: string;
  games: Pick<
    TournamentMatchGame,
    'verificationStatus' | 'warningFlags' | 'startTime' | 'rejectionReason'
  >[];
};

const columnHelper = createColumnHelper<MatchRow>();

// Helper function to get verification status priority for sorting
const getVerificationStatusPriority = (status: VerificationStatus): number => {
  switch (status) {
    case VerificationStatus.Verified:
      return 4;
    case VerificationStatus.PreVerified:
      return 3;
    case VerificationStatus.None:
      return 2;
    case VerificationStatus.PreRejected:
      return 1;
    case VerificationStatus.Rejected:
      return 0;
    default:
      return -1;
  }
};

export const columns = [
  columnHelper.accessor('status', {
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Status
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ getValue }) => (
      <div className="flex justify-center">
        <VerificationBadge
          verificationStatus={getValue().verificationStatus}
          warningFlags={getValue().warningFlags}
          rejectionReason={getValue().rejectionReason}
          entityType="match"
          displayText
        />
      </div>
    ),
    sortingFn: (rowA, rowB) => {
      const priorityA = getVerificationStatusPriority(
        rowA.original.status.verificationStatus
      );
      const priorityB = getVerificationStatusPriority(
        rowB.original.status.verificationStatus
      );
      return priorityA - priorityB;
    },
  }),
  columnHelper.accessor('name', {
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Name
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ getValue, row }) => (
      <div className="max-w-[500px] text-wrap">
        <Link
          href={`/matches/${row.original.id}`}
          className="break-words hover:underline"
        >
          {getValue() || `Match ${row.original.id}`}
        </Link>
        {/* Mobile-only additional info */}
        <div className="text-muted-foreground mt-1 flex flex-col gap-1 text-xs md:hidden">
          <div className="flex items-center gap-2">
            <span>{new Date(row.original.startDate).toLocaleDateString()}</span>
            <span>•</span>
            <span>{row.original.games.length} games</span>
          </div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('games', {
    id: 'pips',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hidden h-auto p-0 font-semibold hover:bg-transparent md:flex"
        >
          Games
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ getValue }) => {
      const games = getValue();
      // Sort games by start time before rendering pips
      const sortedGames = [...games].sort((a, b) => {
        const startA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const startB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return startA - startB;
      });
      return (
        <div className="hidden max-w-[200px] flex-wrap gap-1 md:flex">
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
    sortingFn: (rowA, rowB) => {
      const gamesA = rowA.original.games.length;
      const gamesB = rowB.original.games.length;
      return gamesA - gamesB;
    },
  }),
  columnHelper.accessor('startDate', {
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hidden h-auto p-0 font-semibold hover:bg-transparent md:flex"
        >
          Start Date
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ getValue }) => (
      <span className="hidden md:inline">
        {formatUTCDateFull(new Date(getValue()))}
      </span>
    ),
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.original.startDate).getTime();
      const dateB = new Date(rowB.original.startDate).getTime();
      return dateA - dateB;
    },
  }),
];
