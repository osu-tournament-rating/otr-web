import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Icon + value pair used for every inline beatmap statistic. */
export default function BeatmapMetric({
  icon,
  value,
  ariaLabel,
  testId,
  className,
  valueClassName,
}: {
  icon: ReactNode;
  value: ReactNode;
  ariaLabel?: string;
  testId?: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <span
      data-testid={testId}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-muted-foreground',
        className
      )}
    >
      {icon}
      <span
        data-testid={testId ? `${testId}-value` : undefined}
        className={cn('font-medium text-foreground', valueClassName)}
      >
        {value}
      </span>
    </span>
  );
}
