import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * The strip at the top of a list's panel, laid out like the beatmap list:
 * search, sort and the Filters button on the first row; scope, ruleset
 * chips, view options and the result count on the second; active-filter
 * chips under both. Pass only the slots a list has. It wraps on phones
 * instead of scrolling sideways.
 */
export function ListToolbar({
  label,
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
  const hasControls = Boolean(sort || filters);
  const hasSecondRow = Boolean(scope || rulesets || view || count != null);

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
      {search || hasControls ? (
        <div
          className={cn(
            'flex gap-2 md:items-start md:gap-4',
            // Without a sort, the Filters button fits beside search on phones.
            sort ? 'flex-col md:flex-row' : 'flex-row items-start'
          )}
        >
          {search ? <div className="min-w-0 flex-1">{search}</div> : null}
          {hasControls ? (
            <div
              className={cn(
                'flex min-w-0 items-start gap-2 md:shrink-0 md:gap-4',
                !sort && 'shrink-0',
                search && 'md:border-l md:pl-4',
                !search && 'md:ml-auto'
              )}
            >
              {sort ? (
                <div className="min-w-0 flex-1 md:flex-none">{sort}</div>
              ) : null}
              {filters ? (
                <div
                  className={cn('shrink-0', sort && 'border-l pl-2 md:pl-4')}
                >
                  {filters}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasSecondRow ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {scope ? <div className="shrink-0">{scope}</div> : null}
          {rulesets ? <div className="min-w-0">{rulesets}</div> : null}
          {view || count != null ? (
            <div className="ml-auto flex shrink-0 items-center gap-3">
              {view}
              {count != null ? (
                <span
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-xs whitespace-nowrap text-muted-foreground"
                >
                  {count}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeFilters ? (
        <div className="border-t pt-3 empty:hidden">{activeFilters}</div>
      ) : null}
    </div>
  );
}
