import type * as React from 'react';

import { Button } from '@/components/kit/controls/Button';
import { formatCount } from '@/lib/kit/format/number';
import { formatLoadedReadout } from '@/lib/kit/tables/pagination';
import { cn } from '@/lib/utils';

/**
 * The footer of an activity feed (audit events, a player's recent matches):
 * how many entries are showing and a "Load more" button that appends the
 * next batch. Searchable lists page with PaginationFooter instead.
 */
export function LoadMore({
  onLoadMore,
  hasMore,
  loading = false,
  shownCount,
  totalCount,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  onLoadMore: () => void;
  /** False once the feed has nothing left; the button then gives way to an end note. */
  hasMore: boolean;
  /** Disables the button and spins while the next batch loads. */
  loading?: boolean;
  /** Entries showing now. */
  shownCount?: number;
  /** Every entry, when the server knows it. */
  totalCount?: number | null;
}) {
  const readout = hasMore
    ? shownCount !== undefined
      ? `Showing ${formatLoadedReadout(shownCount, totalCount)}`
      : null
    : shownCount !== undefined
      ? `Showing all ${formatCount(shownCount)}`
      : 'You’ve reached the end';

  return (
    <div
      data-slot="load-more"
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-muted/20 px-4 py-3 dark:bg-muted',
        className
      )}
      {...props}
    >
      <p
        className="text-xs text-muted-foreground tabular-nums"
        aria-live="polite"
      >
        {readout}
      </p>
      {hasMore ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadMore}
          pending={loading}
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}
