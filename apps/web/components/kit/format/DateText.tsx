import type * as React from 'react';

import {
  type DateInput,
  formatDate,
  toDateTimeAttribute,
} from '@/lib/kit/format/date';
import { EMPTY_VALUE } from '@/lib/kit/format/empty';
import { cn } from '@/lib/utils';

/**
 * A calendar day, `Jul 20, 2024`, in UTC. Use it wherever the day matters
 * and the time does not; use `Timestamp` when it does.
 */
export function DateText({
  date,
  empty = EMPTY_VALUE,
  className,
  ...props
}: {
  date: DateInput | null | undefined;
  /** Shown, muted, when there is no date. Defaults to an em dash. */
  empty?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>) {
  const dateTime = toDateTimeAttribute(date, { dateOnly: true });

  if (!dateTime) {
    return (
      <span className={cn('text-muted-foreground', className)} {...props}>
        {empty}
      </span>
    );
  }

  return (
    <time
      dateTime={dateTime}
      className={cn('whitespace-nowrap', className)}
      {...props}
    >
      {formatDate(date)}
    </time>
  );
}
