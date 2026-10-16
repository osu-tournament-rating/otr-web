import type * as React from 'react';

import { Panel } from '@/components/kit/layout/Panel';
import { RowList, RowListItem } from '@/components/kit/layout/RowList';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { StatTile, StatTileGrid } from '@/components/kit/layout/StatTile';
import {
  type ColumnAlign,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/kit/tables/DataTable';
import { PhoneRow, PhoneRowList } from '@/components/kit/tables/PhoneRow';
import type { KitIcon } from '@/lib/kit/layout/icon';
import type { ColumnBreakpoint } from '@/lib/kit/tables/cell';
import { cn } from '@/lib/utils';

// Fixed, not random, so server and client render the same widths.
const TEXT_WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2', 'w-2/3', 'w-1/3'] as const;
const pick = (index: number) => TEXT_WIDTHS[index % TEXT_WIDTHS.length];

/**
 * A pulsing bar that stands in for a line of text inside a real component,
 * such as a value in a StatTile or the description under a PageHeader. It is
 * inline, so the line keeps the height of the text it replaces. Set the width
 * (and a height under the line's) with `className`.
 */
export function SkeletonText({
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'children'>) {
  return (
    <span
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'inline-block h-4 w-24 max-w-full animate-pulse rounded-md bg-accent align-middle',
        className
      )}
      {...props}
    />
  );
}

/**
 * A panel on a loading screen. With no children it draws a header strip and
 * a body block, for a chart or any panel whose content is hard to sketch;
 * give it the loaded panel's height. Pass `label` once per loading screen to
 * announce it.
 */
export function PanelSkeleton({
  label,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'ref'> & {
  /** Makes the panel the screen's status region, such as "Loading reports". */
  label?: string;
}) {
  return (
    <Panel
      as="div"
      data-slot="panel-skeleton"
      role={label ? 'status' : undefined}
      aria-label={label}
      className={cn(children ? undefined : 'flex flex-col', className)}
      {...props}
    >
      {children ?? (
        <>
          <SectionHeaderSkeleton />
          <div className="flex flex-1 p-4">
            <span
              data-slot="skeleton"
              aria-hidden="true"
              className="block min-h-24 w-full flex-1 animate-pulse rounded-lg bg-accent"
            />
          </div>
        </>
      )}
    </Panel>
  );
}

/**
 * The SectionHeader strip while a panel loads. Pass the real `title` and
 * `icon`, which are static, so nothing shifts when the content arrives;
 * without a title the strip draws a bar in its place.
 */
export function SectionHeaderSkeleton({
  icon: Icon,
  title,
  level = 2,
  meta = true,
  actions = 0,
  className,
}: {
  icon?: KitIcon;
  /** The loaded title. */
  title?: string;
  level?: 2 | 3 | 4;
  /** A short bar on the right, where the count goes. */
  meta?: boolean;
  /** Button placeholders after the meta, one per section action. */
  actions?: number;
  className?: string;
}) {
  const metaBar = meta ? <SkeletonText className="h-3 w-20" /> : null;
  const actionBars =
    actions > 0 ? (
      <>
        {Array.from({ length: actions }, (_, index) => (
          <SkeletonText key={index} className="h-8 w-24" />
        ))}
      </>
    ) : null;

  if (title) {
    return (
      <SectionHeader
        icon={Icon}
        title={title}
        level={level}
        meta={metaBar}
        actions={actionBars}
        className={className}
      />
    );
  }

  return (
    <div
      data-slot="section-header-skeleton"
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3',
        className
      )}
    >
      <div className="flex h-6 min-w-0 items-center gap-2">
        {Icon ? (
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
        <SkeletonText className="w-36" />
      </div>
      {metaBar || actionBars ? (
        <div className="flex h-6 shrink-0 items-center gap-3">
          {metaBar}
          {actionBars}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A StatTileGrid while it loads: the real tiles with their static labels and
 * bars for the values, so the grid keeps its exact size.
 */
export function StatTileGridSkeleton({
  labels,
  columns = 3,
  sub = false,
  className,
}: {
  /** The loaded tiles' labels, in order. One tile per label. */
  labels: readonly string[];
  /** Columns from `sm` up, as on the loaded grid. */
  columns?: 2 | 3 | 4;
  /** Adds the muted line under each value. */
  sub?: boolean;
  className?: string;
}) {
  return (
    <StatTileGrid columns={columns} className={className}>
      {labels.map((label) => (
        <StatTile
          key={label}
          label={label}
          // Under the value's 20px line: a 20px bar, centred, would add 2px.
          value={<SkeletonText className="w-20" />}
          sub={sub ? <SkeletonText className="h-3 w-14" /> : undefined}
        />
      ))}
    </StatTileGrid>
  );
}

export interface TableSkeletonColumn {
  /** The loaded header text. Without it the header cell is a bar. */
  label?: string;
  /** A width class such as `w-24`. Columns without one share the free space. */
  width?: string;
  /** `end` for numbers, as on the loaded column. */
  align?: ColumnAlign;
  /** Hides the column below this breakpoint, as on the loaded column. */
  showFrom?: ColumnBreakpoint;
}

function defaultColumns(count: number): TableSkeletonColumn[] {
  return Array.from({ length: count }, (_, index) =>
    index === 0
      ? {}
      : { width: 'w-24', align: index === count - 1 ? 'end' : 'start' }
  );
}

/**
 * A DataTable while it loads, edge to edge inside a panel: the real header
 * strip with the loaded table's labels, and rows of bars in its columns.
 * Pass `phoneRows` (a PhoneRowListSkeleton) when the loaded table has phone
 * rows, as DataTable does.
 */
export function TableSkeleton({
  columns = 4,
  rows = 8,
  header = true,
  cellHeight = 'h-6',
  phoneRows,
  className,
}: {
  /** A column count, or the loaded table's columns. */
  columns?: number | readonly TableSkeletonColumn[];
  rows?: number;
  /** Draws the header row. */
  header?: boolean;
  /**
   * The height of the tallest thing in a loaded cell, which sets the row
   * height. `h-6` fits a 24px avatar or badge, as in the beatmap tables;
   * `h-5` plain text, `h-8` a 32px avatar, `h-9` a two-line cell.
   */
  cellHeight?: string;
  /** Shown instead of the table below tablet width, as on the loaded DataTable. */
  phoneRows?: React.ReactNode;
  /** Classes for the wrapper around the table. */
  className?: string;
}) {
  const cols = typeof columns === 'number' ? defaultColumns(columns) : columns;

  return (
    <DataTable
      fixed
      data-slot="table-skeleton"
      aria-hidden="true"
      phoneRows={phoneRows}
      containerClassName={className}
    >
      {header ? (
        <DataTableHeader>
          <DataTableRow>
            {cols.map((column, index) => (
              <DataTableHead
                key={index}
                align={column.align}
                showFrom={column.showFrom}
                className={column.width}
              >
                {column.label ?? <SkeletonText className="h-3 w-12" />}
              </DataTableHead>
            ))}
          </DataTableRow>
        </DataTableHeader>
      ) : null}
      <DataTableBody>
        {Array.from({ length: rows }, (_, row) => (
          <DataTableRow key={row}>
            {cols.map((column, index) => (
              <DataTableCell
                key={index}
                align={column.align}
                showFrom={column.showFrom}
                empty={false}
                className={column.width}
              >
                <span
                  className={cn(
                    'flex items-center',
                    column.align === 'end' && 'justify-end',
                    cellHeight
                  )}
                >
                  <SkeletonText
                    className={column.width ? 'w-4/5' : pick(row + index)}
                  />
                </span>
              </DataTableCell>
            ))}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

/**
 * PhoneRows while a table loads on a phone. Give it to TableSkeleton's
 * `phoneRows`, as the loaded DataTable takes a PhoneRowList, with the same
 * parts as the loaded rows so each row keeps its height.
 */
export function PhoneRowListSkeleton({
  rows = 5,
  rank = false,
  avatar = false,
  description = true,
  value = true,
  valueDescription = false,
  className,
}: {
  rows?: number;
  /** Adds the rank column, for ranked lists such as the leaderboard. */
  rank?: boolean;
  /** Adds the 24px avatar inside the name. */
  avatar?: boolean;
  /** Adds the muted line under the name. */
  description?: boolean;
  /** Adds the key number on the right. */
  value?: boolean;
  /** Adds the muted line under the number. */
  valueDescription?: boolean;
  className?: string;
}) {
  return (
    <PhoneRowList
      data-slot="phone-row-list-skeleton"
      aria-hidden="true"
      className={className}
    >
      {Array.from({ length: rows }, (_, row) => (
        <PhoneRow
          key={row}
          // Each bar sits in a span so the row keeps the 20px text line.
          rank={rank ? <SkeletonText className="w-6" /> : undefined}
          title={
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {avatar ? (
                <span
                  data-slot="skeleton"
                  className="block size-6 shrink-0 animate-pulse rounded-full bg-accent"
                />
              ) : null}
              <span className="min-w-0 flex-1">
                <SkeletonText className={pick(row)} />
              </span>
            </span>
          }
          description={
            description ? (
              <SkeletonText className={cn('h-3', pick(row + 2))} />
            ) : undefined
          }
          value={
            value ? (
              <span>
                <SkeletonText className="w-12" />
              </span>
            ) : undefined
          }
          valueDescription={
            valueDescription ? <SkeletonText className="h-3 w-10" /> : undefined
          }
        />
      ))}
    </PhoneRowList>
  );
}

const LEADING_CLASSES = {
  avatar: 'size-8 rounded-full',
  square: 'size-10 rounded-md',
  cover: 'h-10 w-18 rounded-md',
} as const;

/**
 * RowList rows while a list loads: the real rows with an avatar or cover,
 * bars for the title and detail line, and the key number on the right. A
 * loading table's phone rows are PhoneRowListSkeleton instead.
 */
export function RowListSkeleton({
  rows = 5,
  leading = 'avatar',
  description = true,
  trailing = true,
  className,
}: {
  rows?: number;
  /** The shape before the title, or `none`. */
  leading?: keyof typeof LEADING_CLASSES | 'none';
  /** Adds the muted line under the title. */
  description?: boolean;
  /** Adds the right-aligned number. */
  trailing?: boolean;
  className?: string;
}) {
  return (
    <RowList data-slot="row-list-skeleton" className={className}>
      {Array.from({ length: rows }, (_, row) => (
        <RowListItem
          key={row}
          leading={
            leading === 'none' ? undefined : (
              <span
                data-slot="skeleton"
                aria-hidden="true"
                className={cn(
                  'block animate-pulse bg-accent',
                  LEADING_CLASSES[leading]
                )}
              />
            )
          }
          title={<SkeletonText className={pick(row)} />}
          description={
            description ? (
              <SkeletonText className={cn('h-3.5', pick(row + 2))} />
            ) : undefined
          }
          trailing={trailing ? <SkeletonText className="w-12" /> : undefined}
        />
      ))}
    </RowList>
  );
}
