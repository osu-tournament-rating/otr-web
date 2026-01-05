'use client';

import { memo, useCallback } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { MatchRow } from '@/app/tournaments/[id]/columns';

interface ExtendedMatchRow extends MatchRow {
  isSelected: boolean;
}

interface TournamentMatchesDataTableWithCheckboxesProps {
  columns: ColumnDef<MatchRow, unknown>[];
  data: ExtendedMatchRow[];
  onSelectMatch: (matchId: number, checked: boolean) => void;
}

const MatchRowWithCheckbox = memo(
  ({
    match,
    cells,
    onSelectMatch,
  }: {
    match: ExtendedMatchRow;
    cells: React.ReactNode;
    onSelectMatch: (matchId: number, checked: boolean) => void;
  }) => {
    const handleCheckboxChange = useCallback(
      (checked: boolean | 'indeterminate') => {
        onSelectMatch(match.id, checked as boolean);
      },
      [match.id, onSelectMatch]
    );

    return (
      <TableRow className="border-border/30 hover:bg-popover/80 border-b transition-colors">
        <TableCell className="w-[40px] py-3">
          <Checkbox
            checked={match.isSelected}
            onCheckedChange={handleCheckboxChange}
            aria-label={`Select ${match.name || 'match'}`}
          />
        </TableCell>
        {cells}
      </TableRow>
    );
  }
);
MatchRowWithCheckbox.displayName = 'MatchRowWithCheckbox';

export default function TournamentMatchesDataTableWithCheckboxes({
  columns,
  data,
  onSelectMatch,
}: TournamentMatchesDataTableWithCheckboxesProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="bg-popover/50 rounded-lg">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-border/50 border-b hover:bg-transparent"
            >
              <TableHead className="w-[40px]" />
              {headerGroup.headers.map((header) => {
                return (
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
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <MatchRowWithCheckbox
                key={row.id}
                match={row.original as ExtendedMatchRow}
                onSelectMatch={onSelectMatch}
                cells={row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              />
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length + 1}
                className="text-muted-foreground h-24 text-center"
              >
                No matches found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
