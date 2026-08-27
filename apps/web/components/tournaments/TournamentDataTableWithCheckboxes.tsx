'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState, type ReactNode } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { stickyTableHeader } from '@/lib/utils/table';

/** Column chrome the renderer puts on the `th` and on every matching `td`. */
export interface TournamentColumnMeta {
  cellClassName?: string;
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

type SelectionProps<TData> =
  | {
      isRowSelected: (row: TData) => boolean;
      onSelectRow: (rowId: number, checked: boolean) => void;
    }
  /** Omitting both renders the table read-only, without a checkbox column. */
  | { isRowSelected?: never; onSelectRow?: never };

type TournamentDataTableWithCheckboxesProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  getRowId: (row: TData) => number;
  /** Names a row inside its checkbox's accessible label. */
  getRowLabel: (row: TData) => string;
  emptyMessage: ReactNode;
} & SelectionProps<TData>;

/** Sortable table shared by the matches and beatmaps tabs. */
export default function TournamentDataTableWithCheckboxes<TData>({
  columns,
  data,
  getRowId,
  getRowLabel,
  emptyMessage,
  isRowSelected,
  onSelectRow,
}: TournamentDataTableWithCheckboxesProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => String(getRowId(row)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const isSelectable = onSelectRow !== undefined;
  const rows = table.getRowModel().rows;

  return (
    <div className={cn('rounded-lg bg-popover/50', stickyTableHeader)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b border-border/50 bg-muted"
            >
              {isSelectable && <TableHead className="w-[40px]" />}
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as
                  TournamentColumnMeta | undefined;
                const sorted = header.column.getIsSorted();

                return (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      header.column.getCanSort()
                        ? sorted
                          ? ARIA_SORT[sorted]
                          : 'none'
                        : undefined
                    }
                    className={cn(
                      'font-semibold text-foreground',
                      meta?.cellClassName
                    )}
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
          {rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={
                  isRowSelected?.(row.original) ? 'selected' : undefined
                }
                className="border-b border-border/30 transition-colors hover:bg-popover/80"
              >
                {isSelectable && (
                  <TableCell className="w-[40px] py-3">
                    <Checkbox
                      checked={isRowSelected(row.original)}
                      onCheckedChange={(checked) =>
                        onSelectRow(getRowId(row.original), checked === true)
                      }
                      aria-label={`Select ${getRowLabel(row.original)}`}
                    />
                  </TableCell>
                )}
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    TournamentColumnMeta | undefined;

                  return (
                    <TableCell
                      key={cell.id}
                      className={cn('py-3', meta?.cellClassName)}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length + (isSelectable ? 1 : 0)}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
