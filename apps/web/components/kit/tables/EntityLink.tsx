import Link from 'next/link';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * An entity's name as a link, with its avatar or cover inside the same link,
 * so each row has one link per destination. Use it in rows where only the
 * name opens the entity (the leaderboard, match lists, reports). It takes
 * the size of the text around it and truncates a long name.
 */
export function EntityLink({
  href,
  leading,
  prefetch = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, 'children'> & {
  /** The avatar, cover or logo. It is hidden from screen readers; the name names the link. */
  leading?: React.ReactNode;
  /** Off by default: a long list would prefetch every row. */
  prefetch?: boolean;
  /** The entity's name. */
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      data-slot="entity-link"
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-2 rounded-sm align-middle font-medium text-foreground transition-colors outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className
      )}
      {...props}
    >
      {leading ? (
        <span aria-hidden="true" className="flex shrink-0">
          {leading}
        </span>
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}
