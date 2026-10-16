import type * as React from 'react';

import { Button } from '@/components/kit/controls/Button';
import { formatCount } from '@/lib/kit/format/number';
import { formatLoadedReadout } from '@/lib/kit/tables/pagination';
import { cn } from '@/lib/utils';

/**
 * The footer of an activity feed (audit logs, an entity's audit history):
 * how many entries are showing and a "Load more" button that appends the
 * next batch. A short list that shows its first few rows and the rest on
 * request (the profile's tournament history and pooled beatmaps) uses it
 * too, with `label="Show more"`. Searchable lists page with
 * PaginationFooter instead.
 */
export function LoadMore({
  onLoadMore,
  hasMore,
  loading = false,
  shownCount,
  totalCount,
  pageSize,
  label = 'Load more',
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
  /**
   * The size of one batch. When the first batch already holds everything
   * (`hasMore` is false and `shownCount` is at most this), the footer
   * renders nothing: a list that never had more needs no end note.
   */
  pageSize?: number;
  /** The button's text, "Load more" by default. It stays while loading. */
  label?: string;
}) {
  if (
    !hasMore &&
    pageSize !== undefined &&
    shownCount !== undefined &&
    shownCount <= pageSize
  ) {
    return null;
  }

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
          {label}
        </Button>
      ) : null}
    </div>
  );
}
