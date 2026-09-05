'use client';

import SimpleTooltip from '@/components/simple-tooltip';
import { formatRelativeTime, formatExactTime } from './formatRelativeTime';

export default function RelativeTime({
  dateString,
  className,
  insideControl = false,
  ...rest
}: {
  dateString: string;
  className?: string;
  /**
   * Set where the time renders inside a link or button, which cannot hold a
   * nested tooltip trigger. The exact time is then reachable by pointer only.
   */
  insideControl?: boolean;
} & React.HTMLAttributes<HTMLTimeElement>) {
  return (
    <SimpleTooltip
      asChild={insideControl}
      content={formatExactTime(dateString)}
    >
      <time
        className={className}
        dateTime={dateString}
        suppressHydrationWarning
        {...rest}
      >
        {formatRelativeTime(dateString)}
      </time>
    </SimpleTooltip>
  );
}
