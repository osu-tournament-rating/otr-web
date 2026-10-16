import { X } from 'lucide-react';
import type * as React from 'react';

import { Button } from '@/components/kit/controls/Button';
import { cn } from '@/lib/utils';

export interface ActiveFilter {
  /** Stable key, usually the param name. */
  key: string;
  /** The whole filter in words, from the `@/lib/kit/lists/filters` helpers. */
  label: string;
  onRemove: () => void;
}

/**
 * The row under a list toolbar that names each active filter as a chip you
 * can remove, with "Clear all" at the end. It shows the panel's filters
 * only: search, sort, ruleset and scope are already visible above, and
 * "Clear all" leaves them alone. Renders nothing when no filter is active.
 */
export function ActiveFilterChips({
  filters,
  onClearAll,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  filters: readonly ActiveFilter[];
  onClearAll: () => void;
}) {
  const active = filters.filter((filter) => filter.label);
  if (active.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Active filters"
      className={cn('flex flex-wrap items-center gap-2', className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className="text-xs font-medium text-muted-foreground"
      >
        Active filters
      </span>
      {active.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={filter.onRemove}
          aria-label={`Remove ${filter.label} filter`}
          className="inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border bg-background py-1 pr-2 pl-2.5 text-xs font-medium proportional-nums transition-colors outline-none hover:border-foreground/30 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/50"
        >
          {/* Long labels wrap inside the chip; they never truncate. */}
          <span className="min-w-0 text-left break-words">{filter.label}</span>
          <X
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}
