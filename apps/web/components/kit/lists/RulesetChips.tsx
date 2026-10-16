'use client';

import type { Ruleset } from '@otr/core/osu';
import type * as React from 'react';

import RulesetIcon from '@/components/icons/RulesetIcon';
import { ChoiceChip } from '@/components/kit/lists/ChoiceChip';
import { RATED_RULESETS, getRulesetLabel } from '@/lib/kit/format/ruleset';
import { cn } from '@/lib/utils';

/**
 * Labelled ruleset chips that filter a list, any number at once. "All" is
 * selected when none is, and choosing it clears the selection. For a page
 * that shows one ruleset at a time (profile, stats), use `RulesetSwitch`.
 */
export function RulesetChips({
  value,
  onValueChange,
  rulesets = RATED_RULESETS,
  showAll = true,
  label = 'Filter by ruleset',
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children' | 'onChange'> & {
  /** Selected rulesets; empty means all. */
  value: readonly Ruleset[];
  onValueChange: (value: Ruleset[]) => void;
  /** The chips to offer, in order. Defaults to the five rated rulesets. */
  rulesets?: readonly Ruleset[];
  /** Show the leading "All" chip. */
  showAll?: boolean;
  /** The group's accessible name. */
  label?: string;
}) {
  const toggle = (ruleset: Ruleset) => {
    const next = value.includes(ruleset)
      ? value.filter((item) => item !== ruleset)
      : [...value, ruleset];
    // Keep the chips' order so the address stays stable.
    onValueChange(rulesets.filter((item) => next.includes(item)));
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex min-w-0 flex-wrap gap-1.5', className)}
      {...props}
    >
      {showAll ? (
        <ChoiceChip
          selected={value.length === 0}
          icon={
            <RulesetIcon
              ruleset="all"
              className="size-4 fill-current"
              aria-hidden="true"
            />
          }
          onClick={() => onValueChange([])}
        >
          All
        </ChoiceChip>
      ) : null}
      {rulesets.map((ruleset) => (
        <ChoiceChip
          key={ruleset}
          selected={value.includes(ruleset)}
          icon={
            <RulesetIcon
              ruleset={ruleset}
              className="size-4 fill-current"
              aria-hidden="true"
            />
          }
          onClick={() => toggle(ruleset)}
        >
          {getRulesetLabel(ruleset)}
        </ChoiceChip>
      ))}
    </div>
  );
}
