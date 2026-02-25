'use client';

import RulesetIcon from '@/components/icons/RulesetIcon';
import { Ruleset } from '@otr/core/osu';
import { cn } from '@/lib/utils';
import SimpleTooltip from '../simple-tooltip';
import { RulesetEnumHelper } from '@/lib/enum-helpers';

interface RulesetButtonProps {
  ruleset: Ruleset;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function RulesetButton({
  ruleset,
  isSelected = false,
  onClick,
  className,
}: RulesetButtonProps) {
  const tooltipText = RulesetEnumHelper.getMetadata(ruleset).text;
  return (
    <button
      data-testid={`ruleset-button-${ruleset}`}
      aria-label={tooltipText}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-full p-2 transition-colors',
        isSelected
          ? 'bg-accent/30 text-accent-foreground'
          : 'hover:bg-muted/80',
        className
      )}
    >
      <SimpleTooltip content={tooltipText}>
        <RulesetIcon
          ruleset={ruleset}
          className={cn(
            'h-6 w-6',
            isSelected ? 'fill-primary' : 'fill-muted-foreground'
          )}
        />
      </SimpleTooltip>
    </button>
  );
}
