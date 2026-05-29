'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Link from 'next/link';
import { Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { OsuAvatar } from '../ui/osu-avatar';
import ModIconset from '@/components/icons/ModIconset';
import { formatAccuracy } from '@/lib/utils/format';
import type { BeatmapTopPerformer } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapTopPerformersTableProps {
  performers: BeatmapTopPerformer[];
  className?: string;
}

const columnHelper = createColumnHelper<BeatmapTopPerformer>();

const columns = [
  columnHelper.display({
    id: 'rank',
    header: '#',
    cell: ({ row }) => (
      <span className="font-medium text-muted-foreground">
        #{row.index + 1}
      </span>
    ),
  }),
  columnHelper.accessor('player.username', {
    header: 'Player',
    cell: ({ row }) => {
      const player = row.original.player;
      return (
        <Link
          href={`/players/${player.id}`}
          className="flex items-center gap-2"
        >
          <OsuAvatar
            osuId={player.osuId}
            username={player.username}
            size={24}
          />
          <span>{player.username}</span>
        </Link>
      );
    },
    enableSorting: false,
  }),
  columnHelper.accessor('score', {
    header: 'Score',
    cell: ({ row }) => (
      <Link
        href={`/matches/${row.original.matchId}?scoreId=${row.original.scoreId}`}
        className="text-primary"
      >
        {row.original.score.toLocaleString()}
      </Link>
    ),
    enableSorting: false,
  }),
  columnHelper.accessor('accuracy', {
    header: 'Accuracy',
    cell: ({ getValue }) => {
      const acc = getValue();
      return acc !== null ? formatAccuracy(acc) : '-';
    },
    enableSorting: false,
  }),
  columnHelper.accessor('mods', {
    header: 'Mods',
    cell: ({ getValue }) => (
      <div className="flex h-5 w-14 items-center">
        <ModIconset
          mods={getValue()}
          className="flex h-full items-center"
          iconClassName="h-5"
        />
      </div>
    ),
    enableSorting: false,
  }),
];

export default function BeatmapTopPerformersTable({
  performers,
  className,
}: BeatmapTopPerformersTableProps) {
  const table = useReactTable({
    data: performers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (performers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex flex-row items-center gap-2">
            <Medal className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl font-bold">Top Scores</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No score data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <Medal className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl font-bold">Top Scores</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-popover/50">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-border/50 hover:bg-transparent"
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
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-border/30 transition-colors hover:bg-popover/80"
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
