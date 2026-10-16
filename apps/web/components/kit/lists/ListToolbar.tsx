import type * as React from 'react';

import { getListToolbarLayout } from '@/lib/kit/lists/toolbar';
import { cn } from '@/lib/utils';

/**
 * The strip at the top of a list's panel, laid out like the beatmap list:
 * search, sort and the Filters button on the first row; scope, ruleset
 * chips, view options and the result count on the second; active-filter
 * chips under both. A list without a search is one strip: scope and ruleset
 * chips on the left, the count, sort and Filters on the right. Pass only the
 * slots a list has. It wraps on phones instead of scrolling sideways, and
 * the count stays on the scope's line rather than taking a row of its own.
 */
export function ListToolbar({
  label,
  leading,
  search,
  sort,
  filters,
  scope,
  rulesets,
  view,
  count,
  activeFilters,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  /** Names the search landmark, such as "Search and filter tournaments". */
  label: string;
  /**
   * A control that is not a search, first on the first row, such as a
   * select that picks what the list holds. Before the search box when there
   * is one; otherwise before the scope.
   */
  leading?: React.ReactNode;
  /** A `SearchField`. */
  search?: React.ReactNode;
  /** A `SortControl`. */
  sort?: React.ReactNode;
  /** A `FilterPanel`. */
  filters?: React.ReactNode;
  /** A `ScopeSwitch`, such as All / Friends. */
  scope?: React.ReactNode;
  /** `RulesetChips` to filter, or a `RulesetSwitch` to pick one. */
  rulesets?: React.ReactNode;
  /** Layout toggles and other view options, before the count. */
  view?: React.ReactNode;
  /** The result count, already formatted: "1,204 tournaments". */
  count?: React.ReactNode;
  /** `ActiveFilterChips`. Its row disappears when it renders nothing. */
  activeFilters?: React.ReactNode;
}) {
  const hasCount = count != null;
  const layout = getListToolbarLayout({
    search: Boolean(search),
    leading: Boolean(leading),
    sort: Boolean(sort),
    filters: Boolean(filters),
    scope: Boolean(scope),
    rulesets: Boolean(rulesets),
    view: Boolean(view),
    count: hasCount,
  });

  const countText = hasCount ? (
    <span
      aria-live="polite"
      aria-atomic="true"
      className="text-xs whitespace-nowrap text-muted-foreground tabular-nums"
    >
      {count}
    </span>
  ) : null;

  const controlsInner = (
    <>
      {sort ? <div className="min-w-0 flex-1 md:flex-none">{sort}</div> : null}
      {filters ? (
        <div className={cn('shrink-0', sort && 'border-l pl-2 md:pl-4')}>
          {filters}
        </div>
      ) : null}
    </>
  );

  return (
    <div
      role="search"
      aria-label={label}
      className={cn(
        'flex flex-col gap-3 border-b bg-muted/20 p-3 sm:p-4 dark:bg-muted',
        className
      )}
      {...props}
    >
      {layout.searchRow ? (
        <SearchRow
          leading={layout.leading === 'search' ? leading : null}
          search={search}
          count={layout.count === 'search' ? countText : null}
          controls={layout.controls === 'search' ? controlsInner : null}
          hasSort={Boolean(sort)}
        />
      ) : null}

      {layout.scopeRow ? (
        <ScopeRow
          leading={layout.leading === 'scope' ? leading : null}
          scope={scope}
          rulesets={rulesets}
          view={view}
          count={layout.count === 'scope' ? countText : null}
          controls={layout.controls === 'scope' ? controlsInner : null}
          hasSort={Boolean(sort)}
        />
      ) : null}

      {activeFilters ? (
        <div className="border-t pt-3 empty:hidden">{activeFilters}</div>
      ) : null}
    </div>
  );
}

/** Search, then sort and Filters after a divider on the right. */
function SearchRow({
  leading,
  search,
  count,
  controls,
  hasSort,
}: {
  leading: React.ReactNode;
  search: React.ReactNode;
  count: React.ReactNode;
  controls: React.ReactNode;
  hasSort: boolean;
}) {
  const searchBox = <div className="min-w-0 flex-1">{search}</div>;

  return (
    <div
      className={cn(
        'flex gap-2 md:items-start md:gap-4',
        // Without a sort, the Filters button fits beside search on phones.
        hasSort ? 'flex-col md:flex-row' : 'flex-row items-start'
      )}
    >
      {leading || count ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-3 gap-y-2">
          {leading ? (
            <div className="flex min-h-10 shrink-0 items-center">{leading}</div>
          ) : null}
          <div className="min-w-48 flex-1">{search}</div>
          {count ? (
            // Beside the search box, level with it; on a narrow phone with a
            // Filters button too, it wraps under the box, on the right.
            <div className="ml-auto flex h-10 shrink-0 items-center">
              {count}
            </div>
          ) : null}
        </div>
      ) : (
        searchBox
      )}
      {controls ? (
        <div
          className={cn(
            'flex min-w-0 items-start gap-2 md:shrink-0 md:gap-4 md:border-l md:pl-4',
            !hasSort && 'shrink-0'
          )}
        >
          {controls}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Scope, ruleset chips, view options and the count, plus sort and Filters
 * when the list has no search. One line from tablet width. On phones the
 * count follows the scope on its line; the ruleset chips take the next
 * line, and sort and Filters the last. A scope too wide to share its line
 * (four options at 390px) sends the count down beside sort and Filters
 * instead, so the count never sits on a line alone when there is a sort.
 * A leading control or scope with only the Filters button keeps both on one
 * line on phones too, Filters on the right, until they don't fit.
 */
function ScopeRow({
  leading,
  scope,
  rulesets,
  view,
  count,
  controls,
  hasSort,
}: {
  leading: React.ReactNode;
  scope: React.ReactNode;
  rulesets: React.ReactNode;
  view: React.ReactNode;
  count: React.ReactNode;
  controls: React.ReactNode;
  hasSort: boolean;
}) {
  const hasStart = Boolean(leading || scope);
  const hasEnd = Boolean(view || count);
  // Just Filters after the start: as wide as the button, not a 192px
  // column, so it shares the start's line whenever both fit.
  const filtersOnly = hasStart && !rulesets && !hasEnd && !hasSort;

  // Source order is the tablet order. On phones `order` moves the count up
  // beside the scope and the ruleset chips under them. Without chips, sort
  // and Filters start at 192px and grow: they wrap under a scope and count
  // that share a line, and join the count when it wraps.
  return (
    <div
      data-slot="list-toolbar-scope-row"
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      {hasStart ? (
        <div className="order-1 flex max-w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 md:order-none">
          {leading ? <div className="shrink-0">{leading}</div> : null}
          {scope ? <div className="max-w-full shrink-0">{scope}</div> : null}
        </div>
      ) : null}
      {rulesets ? (
        <div
          className={cn(
            'min-w-0 md:order-none md:min-w-48 md:flex-1 md:basis-0',
            // Under the scope. Without one, first: at their full width, so
            // on a phone the chips keep two lines and the count follows on
            // the right rather than squeezing them into a column.
            hasStart ? 'order-3 basis-full' : 'order-1 grow'
          )}
        >
          {rulesets}
        </div>
      ) : null}
      {hasEnd ? (
        <div className="order-2 ml-auto flex shrink-0 items-center justify-end gap-3 md:order-none">
          {view}
          {count}
        </div>
      ) : null}
      {controls ? (
        <div
          className={cn(
            'order-4 flex min-w-0 items-start gap-2 md:order-none md:flex-none md:shrink-0 md:basis-auto md:gap-4',
            rulesets
              ? 'basis-full'
              : filtersOnly
                ? 'ml-auto flex-none basis-auto'
                : 'flex-1 basis-48',
            (hasStart || rulesets || hasEnd) && 'md:border-l md:pl-4',
            !hasEnd && 'md:ml-auto'
          )}
        >
          {controls}
        </div>
      ) : null}
    </div>
  );
}
