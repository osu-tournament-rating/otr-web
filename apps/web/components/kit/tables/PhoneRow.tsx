import Link from 'next/link';
import type * as React from 'react';

import { MissingValue } from '@/components/kit/tables/MissingValue';
import { isMissingValue } from '@/lib/kit/tables/cell';
import {
  ROW_HIGHLIGHT,
  ROW_HOVER_TINT,
  ROW_TITLE_HOVER,
} from '@/lib/kit/tables/row';
import { cn } from '@/lib/utils';

/**
 * The list that replaces a table below tablet width, so nothing scrolls
 * sideways. Its rows share columns: ranks, names and key numbers line up
 * from row to row. Pass it to DataTable's `phoneRows`, which shows it only
 * on phones.
 */
export function PhoneRowList({
  as: Tag = 'ul',
  className,
  ...props
}: Omit<React.ComponentProps<'ul'>, 'ref'> & {
  /** `ol` when the order means something, such as a leaderboard. */
  as?: 'ul' | 'ol';
}) {
  return (
    <Tag
      data-slot="phone-row-list"
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)_auto] divide-y',
        className
      )}
      {...props}
    />
  );
}

/**
 * One row on a phone: a rank, the name (an EntityLink, with its avatar
 * inside), one muted line for the columns the phone hides, and the key
 * number on the right, with an icon such as the tier 4px to its left.
 */
export function PhoneRow({
  rank,
  title,
  description,
  value,
  valueAdornment,
  valueDescription,
  href,
  linkLabel,
  highlight = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'li'>, 'title' | 'value'> & {
  /** Already formatted, such as `#1,204`. Leave it out on unranked lists. */
  rank?: React.ReactNode;
  /** The name: an EntityLink, then a flag or status icon. */
  title: React.ReactNode;
  /** One muted line, such as `42 tournaments · 61% win rate`. */
  description?: React.ReactNode;
  /** The number the table is about, already formatted, such as the rating. */
  value?: React.ReactNode;
  /** An icon 4px left of the value, such as the tier (20–24px, named on tap). */
  valueAdornment?: React.ReactNode;
  /** A muted line under the value, such as a RatingDelta. */
  valueDescription?: React.ReactNode;
  /**
   * Makes the whole row one link with the hover tint. Only for lists whose
   * rows open as a whole (beatmap list, tournament list, pooled beatmaps);
   * the row then holds no other link or button, so `title` is plain text.
   */
  href?: string;
  /** The row link's accessible name. Always set it with `href`. */
  linkLabel?: string;
  /** The signed-in player's own row. Say so in words too. */
  highlight?: boolean;
}) {
  const hasValue = value !== undefined || valueAdornment !== undefined;
  const content = (
    <>
      {rank !== undefined ? (
        <span className="col-start-1 pr-3 text-sm font-medium text-muted-foreground tabular-nums">
          {rank}
        </span>
      ) : null}
      <div className="col-start-2 min-w-0">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          {title}
        </div>
        {description ? (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {description}
          </div>
        ) : null}
        {children}
      </div>
      {hasValue ? (
        <div className="col-start-3 pl-3 text-right">
          <div className="flex items-center justify-end gap-1 text-sm font-semibold tabular-nums">
            {valueAdornment}
            {isMissingValue(value) ? <MissingValue /> : value}
          </div>
          {valueDescription ? (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {valueDescription}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
  const rowClassName =
    'col-span-full grid grid-cols-subgrid items-center px-4 py-2.5';

  if (href) {
    return (
      <li
        data-slot="phone-row"
        className={cn('col-span-full grid grid-cols-subgrid', className)}
        {...props}
      >
        <Link
          href={href}
          prefetch={false}
          aria-label={linkLabel}
          className={cn(
            rowClassName,
            'group',
            ROW_HOVER_TINT,
            ROW_TITLE_HOVER,
            'focus-visible:relative focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset',
            highlight && ROW_HIGHLIGHT
          )}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li
      data-slot="phone-row"
      className={cn(rowClassName, highlight && ROW_HIGHLIGHT, className)}
      {...props}
    >
      {content}
    </li>
  );
}
