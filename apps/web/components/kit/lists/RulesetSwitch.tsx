'use client';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import type { Ruleset } from '@otr/core/osu';
import type * as React from 'react';

import RulesetIcon from '@/components/icons/RulesetIcon';
import { choiceChipClassName } from '@/components/kit/lists/ChoiceChip';
import { buttonVariants } from '@/components/ui/button';
import { RATED_RULESETS, getRulesetLabel } from '@/lib/kit/format/ruleset';
import { cn } from '@/lib/utils';

/**
 * The ruleset chips as a single choice, for pages that show one ruleset at a
 * time: the profile, stats and the leaderboard. Arrow keys move between
 * rulesets. To filter a list by any number of rulesets, use `RulesetChips`.
 */
export function RulesetSwitch({
  value,
  onValueChange,
  rulesets = RATED_RULESETS,
  label = 'Ruleset',
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof RadioGroupPrimitive.Root>,
  'value' | 'defaultValue' | 'onValueChange' | 'children' | 'orientation'
> & {
  value: Ruleset;
  onValueChange: (value: Ruleset) => void;
  /** The chips to offer, in order. Defaults to the five rated rulesets. */
  rulesets?: readonly Ruleset[];
  /** The group's accessible name. */
  label?: string;
}) {
  return (
    <RadioGroupPrimitive.Root
      aria-label={label}
      orientation="horizontal"
      value={String(value)}
      onValueChange={(next) => {
        const ruleset = rulesets.find((item) => String(item) === next);
        if (ruleset !== undefined) onValueChange(ruleset);
      }}
      className={cn('flex min-w-0 flex-wrap gap-1.5', className)}
      {...props}
    >
      {rulesets.map((ruleset) => (
        <RadioGroupPrimitive.Item
          key={ruleset}
          value={String(ruleset)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            choiceChipClassName
          )}
        >
          <RulesetIcon
            ruleset={ruleset}
            className="size-4 fill-current"
            aria-hidden="true"
          />
          {getRulesetLabel(ruleset)}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
