import type * as React from 'react';

import { type DateInput, formatDateRange } from '@/lib/kit/format/date';
import { EMPTY_VALUE } from '@/lib/kit/format/empty';
import { cn } from '@/lib/utils';

/**
 * A span of days, `Jul 20 – Aug 3, 2024`, sharing the month and year where
 * both ends do. One open end reads `From Jul 20, 2024` or `Until Aug 3,
 * 2024`. Use it for tournament dates and any other range of days.
 */
export function DateRangeText({
  start,
  end,
  empty = EMPTY_VALUE,
  className,
  ...props
}: {
  start: DateInput | null | undefined;
  end: DateInput | null | undefined;
  /** Shown, muted, when both ends are missing. Defaults to an em dash. */
  empty?: string;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>) {
  const text = formatDateRange(start, end, { empty: '' });

  return (
    <span
      className={cn(
        'whitespace-nowrap',
        !text && 'text-muted-foreground',
        className
      )}
      {...props}
    >
      {text || empty}
    </span>
  );
}
