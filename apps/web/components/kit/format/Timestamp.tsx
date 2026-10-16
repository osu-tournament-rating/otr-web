import type * as React from 'react';

import {
  type DateInput,
  formatTimestamp,
  toDateTimeAttribute,
} from '@/lib/kit/format/date';
import { EMPTY_VALUE } from '@/lib/kit/format/empty';
import { cn } from '@/lib/utils';

/**
 * A moment, `Jul 20, 2024, 15:42 UTC`, always in UTC with the zone written
 * out. Use it for match and game times, report and audit times, and in the
 * tooltip of a relative time.
 */
export function Timestamp({
  date,
  seconds = false,
  empty = EMPTY_VALUE,
  className,
  ...props
}: {
  date: DateInput | null | undefined;
  /** Add seconds where two events can share a minute. */
  seconds?: boolean;
  /** Shown, muted, when there is no time. Defaults to an em dash. */
  empty?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>) {
  const dateTime = toDateTimeAttribute(date);

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
      {formatTimestamp(date, { seconds })}
    </time>
  );
}
