'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { Fragment } from 'react';
import type * as React from 'react';

import { IconButton } from '@/components/kit/controls/IconButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SORT_DIRECTION_LABELS,
  flipSortDirection,
  type SortDirection,
  type SortKey,
  type SortState,
} from '@/lib/kit/lists/sort';
import { cn } from '@/lib/utils';

export interface SortOption<K extends SortKey> {
  value: K;
  label: string;
  /** The direction this key starts in when picked. Keeps the current one if unset. */
  defaultDirection?: SortDirection;
  /**
   * Words for each direction in the button's tooltip, such as "Newest
   * first". Defaults to "Ascending order" and "Descending order".
   */
  directionLabels?: Readonly<Record<SortDirection, string>>;
  /** Options with different groups get a divider between them. */
  group?: string;
}

/**
 * Sort for a list toolbar: a dropdown of keys plus a button that flips the
 * direction. It reads and writes the same `SortState` as sortable table
 * headers, so the two always agree.
 */
export function SortControl<K extends SortKey>({
  value,
  onValueChange,
  options,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'onChange' | 'children'> & {
  value: SortState<K>;
  onValueChange: (value: SortState<K>) => void;
  options: readonly SortOption<K>[];
  /** What is sorted, such as "Sort tournaments by". Names the dropdown. */
  label: string;
}) {
  const current = options.find((option) => option.value === value.key);
  const labels = current?.directionLabels ?? SORT_DIRECTION_LABELS;
  const directionLabel = labels[value.direction];

  return (
    <div
      role="group"
      aria-label="Sorting"
      className={cn(
        'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex',
        className
      )}
      {...props}
    >
      <Select
        value={String(value.key)}
        onValueChange={(next) => {
          const option = options.find((item) => String(item.value) === next);
          if (!option) return;
          onValueChange({
            key: option.value,
            direction: option.defaultDirection ?? value.direction,
          });
        }}
      >
        <SelectTrigger
          aria-label={label}
          className="h-10 w-full min-w-0 bg-background md:w-48 dark:bg-input/50 dark:shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option, index) => (
            <Fragment key={String(option.value)}>
              {index > 0 && option.group !== options[index - 1].group ? (
                <SelectSeparator />
              ) : null}
              <SelectItem value={String(option.value)}>
                {option.label}
              </SelectItem>
            </Fragment>
          ))}
        </SelectContent>
      </Select>

      <IconButton
        variant="outline"
        size="lg"
        label={`Sort order is ${value.direction === 'asc' ? 'ascending' : 'descending'}`}
        tooltip={directionLabel}
        icon={value.direction === 'desc' ? ArrowDown : ArrowUp}
        onClick={() =>
          onValueChange({
            key: value.key,
            direction: flipSortDirection(value.direction),
          })
        }
        className="bg-background dark:bg-input/50 dark:shadow-none"
      />
    </div>
  );
}
