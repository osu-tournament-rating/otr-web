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
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TournamentRatingsViewProps {
  playerStats: TournamentPlayerStats[];
}

const SortableHeader = ({
  column,
  children,
}: {
  column: {
    toggleSorting: (desc?: boolean) => void;
    getIsSorted: () => false | 'asc' | 'desc';
  };
  children: React.ReactNode;
}) => (
  <Button
    variant="ghost"
    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
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
);

const RatingChangeCell = ({ value }: { value: number }) => {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div
      className={cn(
        'text-center font-medium',
        isPositive && 'text-green-600 dark:text-green-400',
        isNegative && 'text-red-600 dark:text-red-400',
        !isPositive && !isNegative && 'text-muted-foreground'
      )}
    >
      {isPositive ? '+' : ''}
      {value.toFixed(1)}
    </div>
  );
};

const PlayerCell = ({
  player,
}: {
  player: TournamentPlayerStats['player'];
}) => (
  <div className="flex min-w-0 items-center gap-3">
    <Image
      src={`https://a.ppy.sh/${player.osuId}`}
      alt={`${player.username} avatar`}
      className="flex-shrink-0 rounded-full"
      width={32}
      height={32}
    />
    <Link
      href={`/players/${player.id}`}
      className="truncate font-medium transition-colors hover:text-primary"
    >
      {player.username}
    </Link>
  </div>
);

export default function TournamentRatingsView({
  playerStats,
}: TournamentRatingsViewProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'averageRatingDelta', desc: true },
  ]);

  const columns: ColumnDef<TournamentPlayerStats>[] = useMemo(
    () => [
      {
        accessorKey: 'player',
        header: () => <div className="text-center font-semibold">Player</div>,
        cell: ({ row }) => <PlayerCell player={row.original.player} />,
        size: 200,
        enableSorting: false,
      },
      {
        accessorKey: 'ratingBefore',
        header: ({ column }) => (
          <SortableHeader column={column}>Rating Before</SortableHeader>
        ),
        cell: () => (
          <div className="text-center font-medium text-muted-foreground">
            N/A
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'ratingAfter',
        header: ({ column }) => (
          <SortableHeader column={column}>Rating After</SortableHeader>
        ),
        cell: () => (
          <div className="text-center font-medium text-muted-foreground">
            N/A
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'averageRatingDelta',
        header: ({ column }) => (
          <SortableHeader column={column}>Rating Change</SortableHeader>
        ),
        cell: ({ getValue }) => (
          <RatingChangeCell value={getValue() as number} />
        ),
      },
    ],
    []
  );

  const downloadCSV = useCallback(() => {
    const headers = [
      'Player',
      'Rating Before',
      'Rating After',
      'Rating Change',
    ];

    const csvData = playerStats.map((stat) => [
      stat.player.username,
      'N/A',
      'N/A',
      stat.averageRatingDelta.toFixed(1),
    ]);

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
  }, [playerStats]);

  const table = useReactTable({
    data: playerStats,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (playerStats.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No rating data available for this tournament.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
      <div className="overflow-x-auto rounded-lg border bg-gradient-to-br from-background to-muted/20">
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
                    className="font-semibold text-foreground"
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
                    'transition-colors duration-200 hover:bg-muted/30',
                    index % 2 === 0 ? 'bg-background/50' : 'bg-muted/10'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
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
