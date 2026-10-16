'use client';

import { useEffect, useState } from 'react';

import TapTooltip from '@/components/tap-tooltip';
import {
  type DateInput,
  formatRelativeTime,
  formatTimestamp,
  toDate,
  toDateTimeAttribute,
} from '@/lib/kit/format/date';
import { EMPTY_VALUE } from '@/lib/kit/format/empty';
import { cn } from '@/lib/utils';

/** How often the text catches up with the clock. */
const TICK_MS = 30_000;

/**
 * Time since an event, `3h ago`, with the full UTC timestamp on hover,
 * focus and tap. Only for activity feeds, such as the audit log and
 * reports; everywhere else use `Timestamp` or `DateText`.
 */
export function RelativeTime({
  date,
  now,
  side = 'top',
  empty = EMPTY_VALUE,
  className,
}: {
  date: DateInput | null | undefined;
  /** A fixed "now", which also stops the clock. For demos and tests. */
  now?: DateInput;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Shown, muted, when there is no time. Defaults to an em dash. */
  empty?: string;
  className?: string;
}) {
  const isFixed = now !== undefined;
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    if (isFixed) return;
    // The server rendered with its own clock; catch up once hydrated.
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [isFixed]);

  const dateTime = toDateTimeAttribute(date);

  if (!dateTime) {
    return (
      <span className={cn('text-muted-foreground', className)}>{empty}</span>
    );
  }

  return (
    <TapTooltip
      content={formatTimestamp(date)}
      side={side}
      triggerClassName={cn('inline w-auto whitespace-nowrap', className)}
    >
      <time dateTime={dateTime} suppressHydrationWarning>
        {formatRelativeTime(date, (isFixed && toDate(now)) || clock)}
      </time>
    </TapTooltip>
  );
}
