'use client';

import type { TournamentPlayerStats } from '@/lib/orpc/schema/tournament';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState, useMemo, useCallback } from 'react';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import Link from 'next/link';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  TrendingUp,
} from 'lucide-react';
import RatingDelta from '@/components/rating/RatingDelta';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TournamentRatingsViewProps {
  playerStats: TournamentPlayerStats[];
}

const SortableHeader = ({
  column,
  children,
  justify = 'center',
  defaultDesc = true,
}: {
  column: {
    toggleSorting: (desc?: boolean) => void;
    getIsSorted: () => false | 'asc' | 'desc';
  };
  children: React.ReactNode;
  justify?: 'start' | 'center' | 'end';
  defaultDesc?: boolean;
}) => (
  <div className={cn('flex', 'justify-' + justify)}>
    <Button
      variant="ghost"
      onClick={() => {
        const currentSort = column.getIsSorted();
        if (currentSort === false) {
          column.toggleSorting(defaultDesc);
        } else {
          column.toggleSorting(currentSort === 'asc');
        }
      }}
      className="h-auto p-0 font-semibold hover:bg-transparent"
    >
      {children}
      {column.getIsSorted() === 'asc' ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === 'desc' ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  </div>
);

const PlayerCell = ({
  player,
}: {
  player: TournamentPlayerStats['player'];
}) => (
  <Link
    href={`/players/${player.id}`}
    className="flex items-center gap-2 transition-opacity hover:opacity-80 sm:gap-2.5"
  >
    <OsuAvatar
      osuId={player.osuId}
      username={player.username}
      size={28}
      className="ring-border/10 flex-shrink-0 ring-1"
    />
    <span className="truncate text-xs font-medium sm:text-sm">
      {player.username}
    </span>
  </Link>
);

export default function TournamentRatingsView({
  playerStats,
}: TournamentRatingsViewProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'totalChange', desc: true },
  ]);

  const columns: ColumnDef<TournamentPlayerStats>[] = useMemo(
    () => [
      {
        id: 'player',
        accessorFn: (row) => row.player.username.toLowerCase(),
        header: ({ column }) => (
          <SortableHeader column={column} justify="start" defaultDesc={false}>
            Player
          </SortableHeader>
        ),
        cell: ({ row }) => <PlayerCell player={row.original.player} />,
        size: 200,
      },
      {
        id: 'matchRecord',
        header: ({ column }) => (
          <SortableHeader column={column}>Matches</SortableHeader>
        ),
        cell: ({ row }) => {
          return (
            <div className="text-center font-medium">
              <span className="text-green-600">{row.original.matchesWon}</span>
              <span className="text-muted-foreground px-0.5">-</span>
              <span className="text-red-600">{row.original.matchesLost}</span>
            </div>
          );
        },
        accessorFn: (row) =>
          (row.matchesWon - row.matchesLost) * 10000 + row.matchesWon,
      },
      {
        id: 'gameRecord',
        header: ({ column }) => (
          <SortableHeader column={column}>Games</SortableHeader>
        ),
        cell: ({ row }) => {
          return (
            <div className="text-center font-medium">
              <span className="text-green-600">{row.original.gamesWon}</span>
              <span className="text-muted-foreground px-0.5">-</span>
              <span className="text-red-600">{row.original.gamesLost}</span>
            </div>
          );
        },
        accessorFn: (row) =>
          (row.gamesWon - row.gamesLost) * 10000 + row.gamesWon,
      },
      {
        accessorKey: 'ratingBefore',
        header: ({ column }) => (
          <SortableHeader column={column}>Before</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="text-foreground text-center font-medium">
            {Math.round(row.original.ratingBefore)}
          </div>
        ),
      },
      {
        accessorKey: 'ratingAfter',
        header: ({ column }) => (
          <SortableHeader column={column}>After</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="text-foreground text-center font-medium">
            {Math.round(row.original.ratingAfter)}
          </div>
        ),
      },
      {
        accessorKey: 'averageRatingDelta',
        header: ({ column }) => (
          <SortableHeader column={column}>Avg</SortableHeader>
        ),
        cell: ({ getValue }) => (
          <div className="text-center">
            <RatingDelta delta={getValue() as number} />
          </div>
        ),
      },
      {
        id: 'totalChange',
        header: ({ column }) => (
          <SortableHeader column={column}>Total</SortableHeader>
        ),
        accessorFn: (row) => row.averageRatingDelta * row.matchesPlayed,
        cell: ({ getValue }) => {
          return (
            <div className="text-center">
              <RatingDelta delta={getValue() as number} />
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: playerStats,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const downloadCSV = useCallback(() => {
    const headers = [
      'Player',
      'Matches Won',
      'Matches Lost',
      'Games Won',
      'Games Lost',
      'Rating Before',
      'Rating After',
      'Average Change',
      'Total Change',
    ];

    const sortedRows = table.getRowModel().rows;

    const csvData = sortedRows.map((row) => {
      const stat = row.original;

      return [
        stat.player.username,
        stat.matchesWon,
        stat.matchesLost,
        stat.gamesWon,
        stat.gamesLost,
        stat.ratingBefore.toFixed(1),
        stat.ratingAfter.toFixed(1),
        stat.averageRatingDelta.toFixed(1),
        (stat.averageRatingDelta * stat.matchesPlayed).toFixed(1),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'tournament-ratings.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [table]);

  if (playerStats.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        No rating data available for this tournament.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="text-primary h-6 w-6" />
        <h3 className="font-sans text-lg font-semibold">Rating Changes</h3>
        <span className="text-muted-foreground text-sm">
          ({table.getRowModel().rows?.length || 0} players)
        </span>

        <div className="ml-auto flex">
          <Button
            onClick={downloadCSV}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>
      <div className="from-background to-muted/20 overflow-x-auto rounded-lg border bg-gradient-to-br">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-muted/50 hover:bg-muted/70"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-foreground font-semibold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors duration-200',
                    index % 2 === 0 ? 'bg-background/50' : 'bg-muted/10'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'py-2',
                        cell.column.id === 'player' && 'pl-4'
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
