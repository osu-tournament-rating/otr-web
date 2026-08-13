'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Sized by the caller so chips can carry differently shaped glyphs. */
  icon?: ReactNode;
  /** Full-width touch target used inside the filter popover. */
  large?: boolean;
  className?: string;
  'data-testid'?: string;
}

export default function FilterChip({
  label,
  selected,
  onClick,
  icon,
  large = false,
  className,
  ...props
}: FilterChipProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={selected}
      onClick={onClick}
      data-testid={props['data-testid']}
      className={cn(
        'h-8 flex-none gap-1.5 rounded-full bg-background px-3 dark:bg-input/50 dark:shadow-none',
        large && 'h-10 w-full gap-2 px-3 text-base has-[>svg]:px-3',
        selected &&
          'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:bg-primary/20 dark:hover:bg-primary/25',
        className
      )}
    >
      {icon}
      {label}
    </Button>
  );
}
