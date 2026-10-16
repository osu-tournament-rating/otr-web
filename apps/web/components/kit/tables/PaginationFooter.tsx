import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';

import { Button } from '@/components/kit/controls/Button';
import { IconButton } from '@/components/kit/controls/IconButton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination';
import { formatCount } from '@/lib/kit/format/number';
import {
  clampPage,
  formatPageReadout,
  getPageItems,
  getTotalPages,
} from '@/lib/kit/tables/pagination';
import { cn } from '@/lib/utils';

/** Where a page control goes: the page's address, or new state. */
type PageTarget =
  | {
      /** The URL of a page. Renders links; preferred, so a page can be shared. */
      getPageHref: (page: number) => string;
      onPageChange?: never;
    }
  | {
      getPageHref?: never;
      /** For a list paged in component state. Renders buttons. */
      onPageChange: (page: number) => void;
    };

type PageControlTarget = {
  getPageHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
};

/**
 * What a kit Button or IconButton needs to go to `page`: a link drawn on with
 * `asChild`, or a click handler for a list paged in component state.
 */
function pageControl(
  page: number,
  target: PageControlTarget,
  disabled: boolean,
  content?: React.ReactNode
) {
  if (target.getPageHref) {
    return {
      asChild: true,
      children: disabled ? (
        // A link with nowhere to go, such as Previous on the first page.
        <span
          role="link"
          aria-disabled="true"
          className="pointer-events-none opacity-50"
        >
          {content}
        </span>
      ) : (
        <Link href={target.getPageHref(page)} prefetch={false}>
          {content}
        </Link>
      ),
    };
  }

  return {
    disabled,
    onClick: () => target.onPageChange?.(page),
    children: content,
  };
}

/**
 * Previous or Next: a labelled button in a wide footer, an arrow with a
 * tooltip in a narrow one.
 */
function StepControl({
  direction,
  page,
  target,
  disabled,
}: {
  direction: 'previous' | 'next';
  page: number;
  target: PageControlTarget;
  disabled: boolean;
}) {
  const previous = direction === 'previous';
  const label = previous ? 'Previous page' : 'Next page';
  const Arrow = previous ? ChevronLeft : ChevronRight;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={label}
        className="hidden gap-1 px-2 has-[>svg]:px-2 @xl:inline-flex"
        {...pageControl(
          page,
          target,
          disabled,
          previous ? (
            <>
              <Arrow aria-hidden />
              Previous
            </>
          ) : (
            <>
              Next
              <Arrow aria-hidden />
            </>
          )
        )}
      />
      <IconButton
        label={label}
        icon={Arrow}
        className="@xl:hidden"
        {...pageControl(page, target, disabled)}
      />
    </>
  );
}

/**
 * Numbered pages in a panel's footer, with a "1–50 of 8,412" readout, for
 * every searchable or filterable list. Activity feeds use LoadMore instead.
 * In a footer narrower than 36rem (phones, side panels) the page links give
 * way to previous and next arrows around "3 / 169". Renders nothing when
 * everything fits on one page.
 */
export function PaginationFooter({
  page,
  pageSize,
  totalCount,
  getPageHref,
  onPageChange,
  label = 'Pages',
  siblings = 1,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> &
  PageTarget & {
    /** The current page, 1-based. Out-of-range values are clamped. */
    page: number;
    pageSize: number;
    /** Every matching row, not just this page. */
    totalCount: number;
    /** The navigation's accessible name, such as "Leaderboard pages". */
    label?: string;
    /** Pages shown on each side of the current one. */
    siblings?: number;
  }) {
  const totalPages = getTotalPages(totalCount, pageSize);
  if (totalPages <= 1) return null;

  const current = clampPage(page, totalPages);
  const target = { getPageHref, onPageChange };

  return (
    <div
      data-slot="pagination-footer"
      className={cn(
        '@container flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-muted/20 px-4 py-3 dark:bg-muted',
        className
      )}
      {...props}
    >
      <p
        className="text-xs text-muted-foreground tabular-nums"
        aria-live="polite"
      >
        {formatPageReadout(current, pageSize, totalCount)}
      </p>
      <Pagination aria-label={label} className="mx-0 ml-auto w-auto">
        <PaginationContent>
          <PaginationItem>
            <StepControl
              direction="previous"
              page={current - 1}
              target={target}
              disabled={current <= 1}
            />
          </PaginationItem>

          {getPageItems(current, totalPages, siblings).map((item) =>
            typeof item === 'number' ? (
              <PaginationItem key={item} className="hidden @xl:block">
                <Button
                  variant={item === current ? 'outline' : 'ghost'}
                  size="sm"
                  aria-label={`Page ${formatCount(item)}`}
                  aria-current={item === current ? 'page' : undefined}
                  className="min-w-8 px-2 tabular-nums"
                  {...pageControl(item, target, false, formatCount(item))}
                />
              </PaginationItem>
            ) : (
              <PaginationItem key={item} className="hidden @xl:block">
                <PaginationEllipsis className="size-8" />
              </PaginationItem>
            )
          )}

          <PaginationItem
            aria-hidden="true"
            className="px-1 text-xs text-muted-foreground tabular-nums @xl:hidden"
          >
            {formatCount(current)} / {formatCount(totalPages)}
          </PaginationItem>

          <PaginationItem>
            <StepControl
              direction="next"
              page={current + 1}
              target={target}
              disabled={current >= totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
