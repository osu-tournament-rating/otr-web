import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';

import { DataTableHead } from '@/components/kit/tables/DataTable';
import {
  type SortDirection,
  type SortKey,
  type SortState,
  getAriaSort,
  toggleSort,
} from '@/lib/kit/lists/sort';
import { aboutLabel } from '@/lib/kit/layout/about-label';
import type { ColumnBreakpoint } from '@/lib/kit/tables/cell';
import { cn } from '@/lib/utils';

/** Where a header click goes: new state, or the address of the re-sorted list. */
type SortTarget<K extends SortKey> =
  | {
      /** For a list sorted in component state. */
      onSortChange: (next: SortState<K>) => void;
      getSortHref?: never;
    }
  | {
      onSortChange?: never;
      /**
       * For a list sorted in the address: the URL of the list sorted by
       * `next`. The header then renders a link, so it works in server
       * components.
       */
      getSortHref: (next: SortState<K>) => string;
    };

/**
 * A column header that sorts the table. It reads and writes the same
 * `{ key, direction }` state as the toolbar's sort control, so the two always
 * agree. Clicking the sorted column flips it; a fresh column starts at
 * `defaultDirection`.
 */
export function SortableHeader<K extends SortKey>({
  sortKey,
  sort,
  onSortChange,
  getSortHref,
  defaultDirection,
  align = 'start',
  numeric = false,
  showFrom,
  info,
  infoLabel,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'th'>, 'children' | 'align'> &
  SortTarget<K> & {
    /** The key this column sorts by. */
    sortKey: NoInfer<K>;
    /** The list's current sort. */
    sort: SortState<K>;
    /** The first direction when this column is chosen. Defaults to descending. */
    defaultDirection?: SortDirection;
    align?: 'start' | 'end';
    numeric?: boolean;
    showFrom?: ColumnBreakpoint;
    /** How to read the column, behind an info button beside the label. */
    info?: React.ReactNode;
    infoLabel?: string;
    /** The column's label, sentence case. */
    children: React.ReactNode;
  }) {
  const end = numeric || align === 'end';
  const active = sort.key === sortKey;
  const next = toggleSort(sort, sortKey, defaultDirection);
  const Icon = active
    ? sort.direction === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  const icon = (
    <Icon
      aria-hidden="true"
      // Muted at full strength: a fainter arrow drops under 3:1 on the strip.
      className={cn(
        'size-3 shrink-0',
        active ? 'text-foreground' : 'text-muted-foreground'
      )}
    />
  );
  // On a right-aligned column the arrow leads, so the label lines up with the numbers.
  const content = end ? (
    <>
      {icon}
      <span>{children}</span>
    </>
  ) : (
    <>
      <span>{children}</span>
      {icon}
    </>
  );
  const controlClassName = cn(
    'inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1 align-middle text-xs font-medium whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
    active ? 'text-foreground' : 'text-muted-foreground',
    end ? '-mr-1' : '-ml-1'
  );

  return (
    <DataTableHead
      aria-sort={getAriaSort(sort, sortKey)}
      data-sort-key={sortKey}
      align={end ? 'end' : 'start'}
      showFrom={showFrom}
      info={info}
      infoLabel={
        infoLabel ??
        (typeof children === 'string' ? aboutLabel(children) : undefined)
      }
      className={className}
      {...props}
    >
      {getSortHref ? (
        <Link
          href={getSortHref(next)}
          scroll={false}
          prefetch={false}
          className={controlClassName}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className={controlClassName}
          onClick={() => onSortChange?.(next)}
        >
          {content}
        </button>
      )}
    </DataTableHead>
  );
}
