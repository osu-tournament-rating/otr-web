import Link from 'next/link';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * - `default`: a name on its own, in a row, tile or hero: medium weight,
 *   foreground, blue on hover.
 * - `inline`: a name inside a running sentence, such as an audit event:
 *   plain weight, the sentence's colour and line, a faint underline that
 *   turns blue with the text on hover.
 */
export type EntityLinkVariant = 'default' | 'inline';

const FOCUS_RING =
  'rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

/**
 * An entity's name as a link, with its avatar or cover inside the same link,
 * so each row has one link per destination. Use it in rows where only the
 * name opens the entity (the leaderboard, match lists, reports). It takes
 * the size of the text around it and truncates a long name unless `wrap`
 * is set; `variant="inline"` is for a name inside a sentence.
 */
export function EntityLink({
  href,
  leading,
  prefetch = false,
  variant = 'default',
  wrap = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, 'children'> & {
  /** The avatar, cover or logo. It is hidden from screen readers; the name names the link. */
  leading?: React.ReactNode;
  /** Off by default: a long list would prefetch every row. */
  prefetch?: boolean;
  variant?: EntityLinkVariant;
  /**
   * Wraps a long name onto more lines instead of truncating it, for names
   * outside table rows (a hero, a dialog, a card). The inline variant always
   * wraps.
   */
  wrap?: boolean;
  /** The entity's name. */
  children: React.ReactNode;
}) {
  if (variant === 'inline') {
    return (
      <Link
        href={href}
        prefetch={prefetch}
        data-slot="entity-link"
        data-variant="inline"
        className={cn(
          FOCUS_RING,
          'font-normal break-words underline decoration-muted-foreground/50 underline-offset-[3px] transition-colors hover:text-link hover:decoration-link',
          className
        )}
        {...props}
      >
        {leading ? (
          // One line tall and at the top of the line, with the leading
          // centred in it, so an avatar up to the line's height neither
          // grows the line nor sits off its middle.
          <span
            aria-hidden="true"
            className="mr-1.5 inline-flex h-lh items-center align-top"
          >
            {leading}
          </span>
        ) : null}
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      data-slot="entity-link"
      className={cn(
        FOCUS_RING,
        // `align-top`: on a line of its own (a cell's second line, under a
        // type label) the box adds nothing to the line's height, and the
        // name keeps the text's baseline. `align-middle` grew it by 1px.
        'inline-flex max-w-full min-w-0 items-center gap-2 align-top font-medium text-foreground transition-colors hover:text-link',
        className
      )}
      {...props}
    >
      {leading ? (
        <span aria-hidden="true" className="flex shrink-0">
          {leading}
        </span>
      ) : null}
      <span
        className={cn(
          'min-w-0',
          // `whitespace-normal`, because a parent that truncates (a
          // RowListItem title) would otherwise keep the name on one line.
          wrap ? 'break-words whitespace-normal' : 'truncate'
        )}
      >
        {children}
      </span>
    </Link>
  );
}
