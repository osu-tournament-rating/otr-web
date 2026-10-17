import type * as React from 'react';

import {
  type DateInput,
  RANGE_SEPARATOR,
  formatDate,
  formatTimeRange,
  formatTimestamp,
  toDate,
} from '@/lib/kit/format/date';
import { EMPTY_VALUE } from '@/lib/kit/format/empty';
import { cn } from '@/lib/utils';

/** Kept here for code that imported it from this file; it lives in the date helpers. */
export { formatTimeRange };

/**
 * A span of time within a day, `15:42:07 – 15:45:30 UTC`, such as when a game
 * started and ended. The day is left out unless `showDate` is set, so use it
 * where the day is already on the page (a match's games); ends on different
 * days always carry their dates, and may then break after the dash. Like
 * every date component it keeps the body's proportional figures.
 */
export function TimeRangeText({
  start,
  end,
  seconds = false,
  showDate = false,
  empty = EMPTY_VALUE,
  className,
  ...props
}: {
  start: DateInput | null | undefined;
  end: DateInput | null | undefined;
  /** Add seconds where two events can share a minute, such as game times. */
  seconds?: boolean;
  /** Write the day before the times when both ends share it. */
  showDate?: boolean;
  /** Shown, muted, when both ends are missing. Defaults to an em dash. */
  empty?: string;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>) {
  const from = toDate(start);
  const to = toDate(end);

  // Two full timestamps are too long for one line on a phone: let the
  // second end wrap, keeping the dash with the first.
  if (from && to && formatDate(from) !== formatDate(to)) {
    return (
      <span className={className} {...props}>
        <span className="whitespace-nowrap">
          {formatTimestamp(from, { seconds })}
          {RANGE_SEPARATOR.trimEnd()}
        </span>{' '}
        <span className="whitespace-nowrap">
          {formatTimestamp(to, { seconds })}
        </span>
      </span>
    );
  }

  const text = formatTimeRange(start, end, { seconds, showDate, empty: '' });

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
