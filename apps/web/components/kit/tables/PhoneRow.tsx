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

/** How a PhoneRow lines up its rank, body and value. */
export type PhoneRowAlign = 'center' | 'start';

/**
 * One row on a phone: a rank, the name (an EntityLink), one muted line for
 * the columns the phone hides, and the key number on the right, with an
 * icon such as the tier 4px to its left. A 24px avatar sits inside the
 * name's link; a 32px one goes in `leading` and spans the name and the line
 * under it.
 */
export function PhoneRow({
  rank,
  leading,
  leadingHref,
  title,
  description,
  value,
  valueAdornment,
  valueDescription,
  align = 'center',
  href,
  linkLabel,
  highlight = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'li'>, 'title' | 'value'> & {
  /** Already formatted, such as `#1,204`. Leave it out on unranked lists. */
  rank?: React.ReactNode;
  /**
   * A 24–32px avatar, cover or logo before the name, spanning the name and
   * the muted line under it. It is hidden from screen readers; the name
   * names the row.
   */
  leading?: React.ReactNode;
  /**
   * Makes `leading` open the entity too, as an avatar inside the name's link
   * would. That link is for pointers only (out of the tab order and hidden
   * from screen readers), so the row keeps one link per destination.
   * Ignored on a row with `href`, which is one link already.
   */
  leadingHref?: string;
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
   * `center` (default) centres the rank and value on the row. `start` sets
   * them level with the name's line, for rows whose value belongs to the
   * first line (a View button beside a two-line body) or whose body runs
   * longer than the value.
   */
  align?: PhoneRowAlign;
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
  const hasLeading = leading != null && leading !== false;
  const text = (
    <>
      <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
        {title}
      </div>
      {description ? (
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {description}
        </div>
      ) : null}
      {children}
    </>
  );
  const content = (
    <>
      {rank !== undefined ? (
        <span className="col-start-1 pr-3 text-sm font-medium text-muted-foreground tabular-nums">
          {rank}
        </span>
      ) : null}
      <div
        className={cn(
          'col-start-2 min-w-0',
          hasLeading && 'flex gap-3',
          hasLeading && (align === 'start' ? 'items-start' : 'items-center')
        )}
      >
        {hasLeading ? (
          <>
            <span
              data-slot="phone-row-leading"
              aria-hidden="true"
              className="flex shrink-0"
            >
              {leadingHref && !href ? (
                <Link
                  href={leadingHref}
                  prefetch={false}
                  tabIndex={-1}
                  className="flex rounded-full"
                >
                  {leading}
                </Link>
              ) : (
                leading
              )}
            </span>
            <div className="min-w-0 flex-1">{text}</div>
          </>
        ) : (
          text
        )}
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
  const rowClassName = cn(
    'col-span-full grid grid-cols-subgrid',
    align === 'start' ? 'items-start' : 'items-center',
    'px-4 py-2.5'
  );

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
