import type * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The chip surface, shared by toggle chips and radio chips. Selected chips
 * get a blue edge, tint and icon; the label stays `foreground`, because
 * primary text is under 4.5:1 on light surfaces. An icon with its own
 * colour class, such as a verification status glyph, keeps that colour.
 */
export const choiceChipClassName = cn(
  // Proportional figures: the body's tabular ones widen the hyphen in "Pre-verified".
  'h-8 flex-none gap-1.5 rounded-full bg-background px-3 font-medium proportional-nums dark:bg-input/50 dark:shadow-none',
  'aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-foreground aria-pressed:hover:bg-primary/15 aria-pressed:[&_svg:not([class*=text-])]:text-primary',
  'dark:aria-pressed:bg-primary/20 dark:aria-pressed:hover:bg-primary/25',
  'aria-checked:border-primary aria-checked:bg-primary/10 aria-checked:text-foreground aria-checked:hover:bg-primary/15 aria-checked:[&_svg:not([class*=text-])]:text-primary',
  'dark:aria-checked:bg-primary/20 dark:aria-checked:hover:bg-primary/25'
);

/**
 * A pill that toggles one option on or off, for chip filters in a list
 * toolbar or a filter panel (ruleset, lobby size, tier). Blue means selected.
 * For one-of-many choices use `RulesetSwitch` or `ScopeSwitch`.
 */
export function ChoiceChip({
  selected,
  icon,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'button'>, 'type' | 'aria-pressed'> & {
  selected: boolean;
  /**
   * A 16px icon before the label, such as a ruleset icon. It turns blue when
   * selected unless it sets its own `text-*` colour, as status glyphs do.
   */
  icon?: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={selected}
      className={cn(choiceChipClassName, className)}
      {...props}
    >
      {icon}
      {children}
    </Button>
  );
}
