'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export default function FilterChip({
  label,
  selected,
  onClick,
  icon,
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
