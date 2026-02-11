'use client';

import SimpleTooltip from '@/components/simple-tooltip';
import { formatRelativeTime, formatExactTime } from './formatRelativeTime';

export default function RelativeTime({
  dateString,
  className,
}: {
  dateString: string;
  className?: string;
}) {
  return (
    <SimpleTooltip content={formatExactTime(dateString)}>
      <time
        className={className}
        dateTime={dateString}
        suppressHydrationWarning
      >
        {formatRelativeTime(dateString)}
      </time>
    </SimpleTooltip>
  );
}
