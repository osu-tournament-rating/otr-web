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
import { ArrowUpDown, ArrowUp, ArrowDown, StickyNote } from 'lucide-react';
import SimpleTooltip from '@/components/simple-tooltip';
import { formatUTCDateFull } from '@/lib/utils/date';
import { TournamentMatchGame } from '@/lib/orpc/schema/tournament';

export type AdminNotePreview = {
  note: string;
  adminUsername: string;
  created: string;
};

export type GameWithNotes = Pick<
  TournamentMatchGame,
  'verificationStatus' | 'warningFlags' | 'startTime' | 'rejectionReason'
> & {
  id: number;
  adminNotes: AdminNotePreview[];
};

export type MatchRow = {
  id: number;
  name: string;
  status: {
    verificationStatus: VerificationStatus;
    warningFlags: MatchWarningFlags;
    rejectionReason: MatchRejectionReason;
    verifiedByUsername: string | null;
  };
  startDate: string;
  games: GameWithNotes[];
  matchAdminNotes: AdminNotePreview[];
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
          verifierUsername={getValue().verifiedByUsername ?? undefined}
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
    cell: ({ getValue, row }) => {
      const matchNotes = row.original.matchAdminNotes;
      const games = row.original.games;
      const gamesWithNotes = games.filter((g) => g.adminNotes.length > 0);

      const hasMatchNotes = matchNotes.length > 0;
      const hasGameNotes = gamesWithNotes.length > 0;
      const hasAnyNotes = hasMatchNotes || hasGameNotes;

      const tooltipContent = hasAnyNotes ? (
        <div className="max-w-xs space-y-2 text-xs">
          {hasMatchNotes && (
            <div>
              <div className="mb-1 font-semibold text-yellow-600 dark:text-yellow-400">
                Match Notes
              </div>
              {matchNotes.map((note, idx) => (
                <div key={idx} className="mb-1 last:mb-0">
                  <div className="text-neutral-200">{note.note}</div>
                  <div className="text-neutral-400">— {note.adminUsername}</div>
                </div>
              ))}
            </div>
          )}
          {hasGameNotes && (
            <div>
              <div className="mb-1 font-semibold text-purple-600 dark:text-purple-400">
                Game Notes
              </div>
              {gamesWithNotes.map((game) =>
                game.adminNotes.map((note, idx) => (
                  <div key={`${game.id}-${idx}`} className="mb-1 last:mb-0">
                    <div className="text-neutral-200">{note.note}</div>
                    <div className="text-neutral-400">
                      — {note.adminUsername}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : null;

      return (
        <div className="max-w-[500px] text-wrap">
          <div className="flex items-center gap-1.5">
            <Link href={`/matches/${row.original.id}`} className="break-words">
              {getValue() || `Match ${row.original.id}`}
            </Link>
            {hasAnyNotes && tooltipContent && (
              <SimpleTooltip
                content={tooltipContent}
                side="right"
                align="start"
              >
                <div className="relative flex-shrink-0">
                  <StickyNote className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                  {hasMatchNotes && (
                    <div className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400" />
                  )}
                  {hasGameNotes && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                  )}
                </div>
              </SimpleTooltip>
            )}
          </div>
          {/* Mobile-only additional info */}
          <div className="text-muted-foreground mt-1 flex flex-col gap-1 text-xs md:hidden">
            <div className="flex items-center gap-2">
              <span>
                {new Date(row.original.startDate).toLocaleDateString()}
              </span>
              <span>•</span>
              <span>{row.original.games.length} games</span>
            </div>
          </div>
        </div>
      );
    },
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
