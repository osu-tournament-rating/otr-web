'use client';

import SimpleTooltip from '@/components/simple-tooltip';
import { formatRelativeTime, formatExactTime } from './formatRelativeTime';

export default function RelativeTime({
  dateString,
  className,
  ...rest
}: {
  dateString: string;
  className?: string;
} & React.HTMLAttributes<HTMLTimeElement>) {
  return (
    <SimpleTooltip content={formatExactTime(dateString)}>
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
