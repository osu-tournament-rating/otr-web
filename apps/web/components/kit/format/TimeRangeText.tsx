import type * as React from 'react';

import {
  type DateInput,
  RANGE_SEPARATOR,
  formatDate,
  formatTimestamp,
  toDate,
} from '@/lib/kit/format/date';
import { EMPTY_VALUE } from '@/lib/kit/format/empty';
import { cn } from '@/lib/utils';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function clockTime(date: Date, seconds: boolean): string {
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  return seconds ? `${time}:${pad(date.getUTCSeconds())}` : time;
}

/**
 * Two moments, such as a game's start and end, in UTC on a 24-hour clock:
 *
 * - `15:42 – 15:45 UTC` when both fall on the same UTC day, with the day
 *   left out unless `showDate` asks for it (`Jul 20, 2024, 15:42 – 15:45 UTC`)
 * - `Jul 20, 2024, 23:58 UTC – Jul 21, 2024, 00:02 UTC` across days
 * - `From …` or `Until …` with the full timestamp when one end is missing
 * - `empty` (an em dash) when both are
 */
export function formatTimeRange(
  start: DateInput | null | undefined,
  end: DateInput | null | undefined,
  {
    seconds = false,
    showDate = false,
    empty = EMPTY_VALUE,
  }: { seconds?: boolean; showDate?: boolean; empty?: string } = {}
): string {
  const from = toDate(start);
  const to = toDate(end);

  if (!from && !to) return empty;
  if (!to) return `From ${formatTimestamp(from, { seconds })}`;
  if (!from) return `Until ${formatTimestamp(to, { seconds })}`;

  if (formatDate(from) !== formatDate(to)) {
    return `${formatTimestamp(from, { seconds })}${RANGE_SEPARATOR}${formatTimestamp(to, { seconds })}`;
  }

  const times = `${clockTime(from, seconds)}${RANGE_SEPARATOR}${clockTime(to, seconds)} UTC`;
  return showDate ? `${formatDate(from)}, ${times}` : times;
}

/**
 * A span of time within a day, `15:42:07 – 15:45:30 UTC`, such as when a game
 * started and ended. The day is left out unless `showDate` is set, so use it
 * where the day is already on the page (a match's games); ends on different
 * days always carry their dates.
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
  const text = formatTimeRange(start, end, { seconds, showDate, empty: '' });

  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums',
        !text && 'text-muted-foreground',
        className
      )}
      {...props}
    >
      {text || empty}
    </span>
  );
}
