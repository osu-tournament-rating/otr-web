'use client';

import Link from 'next/link';
import type * as React from 'react';

import { TableCell, TableRow } from '@/components/ui/table';
import {
  ROW_HIGHLIGHT,
  ROW_HOVER_TINT,
  ROW_TITLE_HOVER,
} from '@/lib/kit/tables/row';
import { cn } from '@/lib/utils';

// Clicks on these keep their own behaviour instead of opening the row.
const INTERACTIVE =
  'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';

/** Opens the row's link for a click that lands outside any other control. */
function openRowLink(event: React.MouseEvent<HTMLTableRowElement>) {
  if (event.defaultPrevented || event.button > 1) return;

  const row = event.currentTarget;
  const target = event.target;
  // Clicks inside a portal (a popover opened from a cell) bubble here too.
  if (!(target instanceof Element) || !row.contains(target)) return;
  const control = target.closest(INTERACTIVE);
  if (control && row.contains(control)) return;
  // Selecting text in a cell is not a click on the row.
  if (window.getSelection()?.toString()) return;

  const link = row.querySelector<HTMLAnchorElement>('a[data-row-link]');
  if (!link) return;

  if (event.button === 1 || event.metaKey || event.ctrlKey || event.shiftKey) {
    window.open(link.href, '_blank', 'noopener');
    return;
  }
  link.click();
}

/**
 * A row that opens as a whole, with the hover tint. Only for tables whose
 * rows already open as a whole today: the beatmap list and a tournament's
 * pooled beatmaps. Put one DataTableLinkCell in it, on the name; a click
 * anywhere else on the row follows that link.
 */
export function DataTableLinkRow({
  highlight = false,
  className,
  onClick,
  onAuxClick,
  ...props
}: React.ComponentProps<'tr'> & {
  /** The signed-in player's own row. */
  highlight?: boolean;
}) {
  return (
    <TableRow
      data-slot="data-table-link-row"
      className={cn(
        'group cursor-pointer',
        ROW_HOVER_TINT,
        ROW_TITLE_HOVER,
        highlight && ROW_HIGHLIGHT,
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        openRowLink(event);
      }}
      onAuxClick={(event) => {
        onAuxClick?.(event);
        if (event.button === 1) openRowLink(event);
      }}
      {...props}
    />
  );
}

/**
 * The cell that holds a DataTableLinkRow's link: an overlay over the cell,
 * so the name, cover and details inside stay plain text. Mark the name with
 * `data-row-title` so it turns blue on hover. A control inside the cell
 * (such as an audio preview) needs `relative z-20` to sit above the link.
 */
export function DataTableLinkCell({
  href,
  label,
  prefetch = false,
  className,
  children,
  ...props
}: React.ComponentProps<'td'> & {
  href: string;
  /** The link's accessible name, such as "View Hotohashiru [Extra]". */
  label: string;
  /** Off by default: a long list would prefetch every row. */
  prefetch?: boolean;
}) {
  return (
    <TableCell className={cn('relative', className)} {...props}>
      <Link
        href={href}
        prefetch={prefetch}
        aria-label={label}
        data-row-link=""
        className="absolute inset-0 z-10 rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-inset"
      />
      {children}
    </TableCell>
  );
}
