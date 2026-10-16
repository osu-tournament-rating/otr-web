import Link from 'next/link';
import type * as React from 'react';

import { typeScale } from '@/components/kit/layout/Typography';
import { ROW_HOVER_TINT, ROW_TITLE_HOVER } from '@/lib/kit/tables/row';
import { cn } from '@/lib/utils';

/**
 * A list inside a panel: divided rows that run edge to edge, with no box
 * around each item. Use it for players, tournaments, matches and events.
 */
export function RowList({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul data-slot="row-list" className={cn('divide-y', className)} {...props} />
  );
}

/**
 * One row. Give it `title` (and optionally `leading`, `description`,
 * `trailing`) for the standard layout, or only `children` for a custom one.
 */
export function RowListItem({
  leading,
  title,
  description,
  trailing,
  href,
  linkLabel,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<'li'>, 'title'> & {
  /** An avatar, cover or icon before the title. */
  leading?: React.ReactNode;
  /** The row's name, usually a link to the entity. */
  title?: React.ReactNode;
  /** One muted line of details under the title. */
  description?: React.ReactNode;
  /** The key number or a status, right-aligned. */
  trailing?: React.ReactNode;
  /**
   * Makes the whole row one link with the shared hover tint, and turns the
   * title blue on hover. Only for lists whose rows already open as a whole;
   * the row must then hold no other link or button. With only `children`,
   * mark the name `data-row-title` for the same cue.
   */
  href?: string;
  /**
   * The row link's accessible name, such as "View Break The Meta Cup".
   * Without it the link reads out every word in the row.
   */
  linkLabel?: string;
}) {
  const structured = title !== undefined;
  const rowClassName = cn('px-4 py-3', structured && 'flex items-center gap-3');
  const content = structured ? (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div
          className={cn(typeScale.rowTitle, 'truncate')}
          data-row-title={href ? true : undefined}
        >
          {title}
        </div>
        {description ? (
          <div className={cn('mt-0.5', typeScale.bodyMuted)}>{description}</div>
        ) : null}
        {children}
      </div>
      {trailing ? (
        <div className="shrink-0 text-right text-sm">{trailing}</div>
      ) : null}
    </>
  ) : (
    children
  );

  if (href) {
    return (
      <li className={className} {...props}>
        <Link
          href={href}
          // Like the beatmap lists: a long list would prefetch every row.
          prefetch={false}
          aria-label={linkLabel}
          className={cn(
            rowClassName,
            ROW_HOVER_TINT,
            ROW_TITLE_HOVER,
            'focus-visible:relative focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset',
            !structured && 'block'
          )}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className={cn(rowClassName, className)} {...props}>
      {content}
    </li>
  );
}
