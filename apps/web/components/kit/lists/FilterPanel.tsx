'use client';

import { useId, useRef } from 'react';
import type * as React from 'react';

import { InfoButton } from '@/components/kit/layout/InfoButton';
import { ChoiceChip } from '@/components/kit/lists/ChoiceChip';
import { FilterButton } from '@/components/kit/lists/FilterButton';
import { Button } from '@/components/kit/controls/Button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/** Set on a box while it holds an edit that Escape should revert, not close over. */
const FILTER_DRAFT_ATTRIBUTE = 'data-filter-draft';

/**
 * The one filter panel: a "Filters" button with the active count, opening a
 * panel whose fields apply as you change them. "Clear all" in its header
 * resets the filters only, never search, sort, ruleset, scope or tab. Put
 * the fields (`RangeFilter`, `ChoiceFilter`, `DayRangeFilter`,
 * `SwitchFilter`, or `FilterField` around anything else) inside it.
 */
export function FilterPanel({
  title,
  activeCount,
  onClearAll,
  open,
  onOpenChange,
  triggerLabel,
  className,
  children,
}: {
  /** The panel's heading, such as "Filter tournaments". */
  title: string;
  activeCount: number;
  onClearAll: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The button's label. Defaults to "Filters". */
  triggerLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <FilterButton count={activeCount} label={triggerLabel} />
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        aria-labelledby={titleId}
        // Focus the panel, not its first control: a number box would open
        // the phone keyboard, and "Clear all" would take a stray Enter.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus({ preventScroll: true });
        }}
        // A box mid-edit takes Escape to revert itself; the panel stays open.
        onEscapeKeyDown={(event) => {
          const active = document.activeElement;
          if (active?.closest(`[${FILTER_DRAFT_ATTRIBUTE}="true"]`)) {
            event.preventDefault();
          }
        }}
        className={cn(
          'flex max-h-[min(40rem,var(--radix-popover-content-available-height))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl p-0',
          className
        )}
      >
        <FilterPanelContent
          title={title}
          titleId={titleId}
          activeCount={activeCount}
          onClearAll={onClearAll}
        >
          {children}
        </FilterPanelContent>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The inside of the filter panel: a header strip with the title and "Clear
 * all", then the fields in a two-column grid that scrolls. `FilterPanel`
 * puts it in a popover; render it directly only for a filter sidebar.
 */
export function FilterPanelContent({
  title,
  titleId,
  activeCount,
  onClearAll,
  className,
  children,
}: {
  title: string;
  /** Lets the surrounding popover name itself after the title. */
  titleId?: string;
  activeCount: number;
  onClearAll: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={activeCount === 0}
          onClick={onClearAll}
          className="-my-1 -mr-3"
        >
          Clear all
        </Button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-x-3 gap-y-5 overflow-y-auto overscroll-contain p-4">
        {children}
      </div>
    </div>
  );
}

/** Props every filter field shares. */
export interface FilterFieldProps {
  label: string;
  /** One short line under the label. */
  description?: React.ReactNode;
  /** A longer explanation behind an info button beside the label. */
  info?: React.ReactNode;
  /** `half` puts two short fields side by side, such as CS and AR. */
  span?: 'full' | 'half';
  className?: string;
}

function FieldLabel({
  id,
  label,
  info,
}: {
  id: string;
  label: string;
  info?: React.ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {/* Labels wrap; they never truncate. */}
      <span id={id} className="min-w-0 text-sm font-medium break-words">
        {label}
      </span>
      {info ? (
        <InfoButton label={`About ${label}`} size="sm">
          {info}
        </InfoButton>
      ) : null}
    </span>
  );
}

/** Lays out one field: label, optional description, then the control. */
export function FilterField({
  label,
  description,
  info,
  span = 'full',
  className,
  aside,
  children,
}: FilterFieldProps & {
  /** Sits at the end of the label row, such as a range's number boxes. */
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const labelId = useId();

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={cn(
        'flex min-w-0 flex-col gap-2',
        span === 'half' ? 'col-span-2 min-[22rem]:col-span-1' : 'col-span-2',
        className
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <FieldLabel id={labelId} label={label} info={info} />
        {aside}
      </div>
      {description ? (
        <p className="-mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}

export interface ChoiceFilterOption<T extends string | number> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/**
 * Chips that each switch one option on or off, such as verification
 * statuses or lobby sizes. Nothing selected means no filter.
 */
export function ChoiceFilter<T extends string | number>({
  options,
  value,
  onValueChange,
  ...field
}: FilterFieldProps & {
  options: readonly ChoiceFilterOption<T>[];
  value: readonly T[];
  onValueChange: (value: T[]) => void;
}) {
  return (
    <FilterField {...field}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <ChoiceChip
              key={String(option.value)}
              selected={selected}
              icon={option.icon}
              onClick={() => {
                const next = selected
                  ? value.filter((item) => item !== option.value)
                  : [...value, option.value];
                // Keep the options' order so the address stays stable.
                onValueChange(
                  options
                    .map((item) => item.value)
                    .filter((item) => next.includes(item))
                );
              }}
            >
              {option.label}
            </ChoiceChip>
          );
        })}
      </div>
    </FilterField>
  );
}

/** An on/off filter, such as "Verified only". */
export function SwitchFilter({
  checked,
  onCheckedChange,
  label,
  description,
  info,
  span = 'full',
  className,
}: FilterFieldProps & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div
      className={cn(
        'flex min-w-0 items-start justify-between gap-3',
        span === 'half' ? 'col-span-2 min-[22rem]:col-span-1' : 'col-span-2',
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <label
            htmlFor={id}
            className="min-w-0 cursor-pointer text-sm font-medium break-words"
          >
            {label}
          </label>
          {info ? (
            <InfoButton label={`About ${label}`} size="sm">
              {info}
            </InfoButton>
          ) : null}
        </span>
        {description ? (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={description ? descriptionId : undefined}
        // The default off track is the popover colour in light mode.
        className="mt-0.5 data-[state=unchecked]:bg-muted-foreground/30"
      />
    </div>
  );
}
