'use client';

import Link from 'next/link';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Ruleset } from '@otr/core/osu';
import { cn } from '@/lib/utils';
import SimpleTooltip from '../simple-tooltip';
import { RulesetEnumHelper } from '@/lib/enum-helpers';

interface RulesetButtonProps {
  ruleset: Ruleset;
  isSelected?: boolean;
  onClick?: () => void;
  /** Renders the control as a link; use it for URL-driven selection. */
  href?: string;
  className?: string;
}

export function RulesetButton({
  ruleset,
  isSelected = false,
  onClick,
  href,
  className,
}: RulesetButtonProps) {
  const tooltipText = RulesetEnumHelper.getMetadata(ruleset).text;
  const classes = cn(
    'cursor-pointer rounded-full p-2 transition-colors',
    isSelected ? 'bg-accent/30 text-accent-foreground' : 'hover:bg-muted/80',
    className
  );
  const icon = (
    <SimpleTooltip content={tooltipText}>
      <RulesetIcon
        ruleset={ruleset}
        className={cn(
          'h-6 w-6',
          isSelected ? 'fill-primary' : 'fill-muted-foreground'
        )}
      />
    </SimpleTooltip>
  );

  if (href) {
    return (
      <Link
        data-testid={`ruleset-button-${ruleset}`}
        aria-label={tooltipText}
        aria-current={isSelected ? 'page' : undefined}
        href={href}
        className={classes}
      >
        {icon}
      </Link>
    );
  }

  return (
    <button
      data-testid={`ruleset-button-${ruleset}`}
      aria-label={tooltipText}
      onClick={onClick}
      className={classes}
    >
      {icon}
    </button>
  );
}
