import type * as React from 'react';

import { InfoButton } from '@/components/kit/layout/InfoButton';
import { MissingValue } from '@/components/kit/tables/MissingValue';
import { aboutLabel } from '@/lib/kit/layout/about-label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type ColumnBreakpoint,
  isMissingValue,
  showFromClass,
} from '@/lib/kit/tables/cell';
import { ROW_HIGHLIGHT } from '@/lib/kit/tables/row';
import { cn } from '@/lib/utils';
import {
  stickyTableHeader,
  stickyTableHeaderInScrollArea,
} from '@/lib/utils/table';

/** Text sits at the start; numbers, and the headers above them, at the end. */
export type ColumnAlign = 'start' | 'end';

type ColumnProps = {
  /** `end` right-aligns the column. Numbers use `numeric` instead. */
  align?: ColumnAlign;
  /** Right-aligned with tabular figures: counts, ratings, ranks, scores. */
  numeric?: boolean;
  /** Hides the column below this breakpoint. Give its header the same value. */
  showFrom?: ColumnBreakpoint;
};

// The first and last cell of every row line up with the panel's 16px padding.
const EDGE_PADDING = '[&_tr>*:first-child]:pl-4 [&_tr>*:last-child]:pr-4';

/**
 * The one table style, from the beatmap pages: small muted headers on a
 * tinted strip, right-aligned numbers, no stripes and no frame. It runs edge
 * to edge inside a Panel, under the SectionHeader or toolbar. Pass
 * `phoneRows` to swap the table for PhoneRows below tablet width.
 */
export function DataTable({
  stickyHeader = false,
  fixed = false,
  phoneRows,
  phoneSort,
  containerClassName,
  className,
  ...props
}: React.ComponentProps<'table'> & {
  /**
   * Keeps the header row in view while a long table scrolls. `page` (or
   * `true`) sticks it under the site header from tablet width; the table
   * then cannot scroll sideways, so hide columns with `showFrom` until it
   * fits. `scroll-area` sticks it to the top of a scrolling box around the
   * table, such as a dialog body.
   */
  stickyHeader?: boolean | 'page' | 'scroll-area';
  /** Fixed layout: columns keep their set widths and long names truncate. */
  fixed?: boolean;
  /** Rows shown instead of the table below tablet width (`PhoneRowList`). */
  phoneRows?: React.ReactNode;
  /**
   * The sort for the phone rows, which have no headers to click: a
   * `SortControl size="sm"` wired to the same `SortState` as the table's
   * SortableHeaders. It sits in a strip above the rows, below tablet width
   * only. Leave it out when the list's toolbar already has a sort.
   */
  phoneSort?: React.ReactNode;
  /** Classes for the wrapper around the table. */
  containerClassName?: string;
}) {
  // `null` or `false` (a list with no rows yet) keeps the table on phones too.
  const hasPhoneRows =
    phoneRows !== undefined && phoneRows !== null && phoneRows !== false;

  return (
    <>
      <div
        data-slot="data-table"
        className={cn(
          hasPhoneRows && 'hidden md:block',
          stickyHeader === 'scroll-area'
            ? stickyTableHeaderInScrollArea
            : stickyHeader && stickyTableHeader,
          containerClassName
        )}
      >
        <Table
          className={cn(EDGE_PADDING, fixed && 'table-fixed', className)}
          {...props}
        />
      </div>
      {hasPhoneRows ? (
        <div data-slot="data-table-phone" className="md:hidden">
          {phoneSort ? (
            // Stands in for the header strip the phone rows replace.
            <div
              data-slot="data-table-phone-sort"
              className="flex items-center gap-3 border-b bg-muted px-4 py-2"
            >
              <span
                aria-hidden="true"
                className="shrink-0 text-xs font-medium text-muted-foreground"
              >
                Sort by
              </span>
              <div className="min-w-0 flex-1">{phoneSort}</div>
            </div>
          ) : null}
          {phoneRows}
        </div>
      ) : null}
    </>
  );
}

/** The header strip: one row of DataTableHead and SortableHeader cells. */
export function DataTableHeader({
  className,
  ...props
}: React.ComponentProps<'thead'>) {
  return (
    <TableHeader className={cn('[&_tr]:bg-muted', className)} {...props} />
  );
}

/** The body: divided rows, no stripes. */
export function DataTableBody(props: React.ComponentProps<'tbody'>) {
  return <TableBody {...props} />;
}

/**
 * A row with no hover tint, for rows where only the name links. A row that
 * opens as a whole is a DataTableLinkRow instead.
 */
export function DataTableRow({
  highlight = false,
  className,
  ...props
}: React.ComponentProps<'tr'> & {
  /** The signed-in player's own row. Say so in words too, such as "You". */
  highlight?: boolean;
}) {
  return (
    <TableRow
      className={cn(highlight && ROW_HIGHLIGHT, className)}
      {...props}
    />
  );
}

/**
 * A column header: 12px, muted, sentence case. Use SortableHeader for a
 * column that sorts.
 */
export function DataTableHead({
  align = 'start',
  numeric = false,
  showFrom,
  info,
  infoLabel,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'th'>, 'align'> &
  ColumnProps & {
    /** How to read the column, behind an info button beside the label. */
    info?: React.ReactNode;
    /** The info button's name. Defaults to "About {label}". */
    infoLabel?: string;
  }) {
  const end = numeric || align === 'end';

  return (
    <TableHead
      className={cn(
        'h-8 text-xs',
        end && 'text-right',
        showFromClass(showFrom),
        className
      )}
      {...props}
    >
      {info ? (
        <span className="inline-flex items-center gap-1 align-middle">
          {children}
          <InfoButton
            size="sm"
            label={
              infoLabel ??
              (typeof children === 'string' ? aboutLabel(children) : 'About')
            }
          >
            {info}
          </InfoButton>
        </span>
      ) : (
        children
      )}
    </TableHead>
  );
}

/**
 * One cell. A missing value (`null`, an empty string or the formatters' em
 * dash) shows a muted em dash read as "No value".
 */
export function DataTableCell({
  align = 'start',
  numeric = false,
  muted = false,
  showFrom,
  empty = true,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'td'>, 'align'> &
  ColumnProps & {
    /** 12px muted text, for secondary columns such as dates and formats. */
    muted?: boolean;
    /**
     * `false` leaves a cell with nothing in it blank instead of showing an
     * em dash, for selection, marker and action columns.
     */
    empty?: boolean;
  }) {
  const end = numeric || align === 'end';

  return (
    <TableCell
      className={cn(
        end && 'text-right',
        numeric && 'tabular-nums',
        muted && 'text-xs text-muted-foreground',
        showFromClass(showFrom),
        className
      )}
      {...props}
    >
      {empty && isMissingValue(children) ? <MissingValue /> : children}
    </TableCell>
  );
}
