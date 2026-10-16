'use client';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import type * as React from 'react';

import { InfoButton } from '@/components/kit/layout/InfoButton';
import { cn } from '@/lib/utils';

export interface ScopeOption<T extends string> {
  value: T;
  label: string;
  /** Shown through an info button when the option cannot be chosen. */
  disabledReason?: string;
  disabled?: boolean;
}

/**
 * A segmented control that picks whose rows a list shows, such as All /
 * Friends on the leaderboard. It belongs in the list toolbar, never in hero
 * tabs. Arrow keys move between options.
 */
export function ScopeSwitch<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof RadioGroupPrimitive.Root>,
  'value' | 'defaultValue' | 'onValueChange' | 'children' | 'orientation'
> & {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly ScopeOption<T>[];
  /** The group's accessible name, such as "Players to show". */
  label: string;
}) {
  const unavailable = options.filter(
    (option) => option.disabled && option.disabledReason
  );

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <RadioGroupPrimitive.Root
        aria-label={label}
        orientation="horizontal"
        value={value}
        onValueChange={(next) => {
          const option = options.find((item) => item.value === next);
          if (option && !option.disabled) onValueChange(option.value);
        }}
        // No overflow clipping: it would cut off the items' focus rings.
        className="inline-flex h-8 items-stretch rounded-md border border-input bg-background shadow-xs dark:bg-input/50 dark:shadow-none"
        {...props}
      >
        {options.map((option) => (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(
              'relative inline-flex min-w-12 cursor-pointer items-center justify-center px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none not-first:border-l not-first:border-input',
              // The frame's inner corners: its radius less its 1px border.
              'first:rounded-l-[calc(var(--radius-md)-1px)] last:rounded-r-[calc(var(--radius-md)-1px)]',
              'hover:bg-accent hover:text-foreground',
              'focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-primary)] dark:data-[state=checked]:bg-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'
            )}
          >
            {option.label}
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      {unavailable.map((option) => (
        <InfoButton
          key={option.value}
          label={`Why ${option.label} is unavailable`}
          size="sm"
        >
          {option.disabledReason}
        </InfoButton>
      ))}
    </div>
  );
}
