'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import ClientOnly from '../client-only';

type Formats = 'short' | 'full';

function getFullTimestampParts(date: Date): [string, string] {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'shortOffset',
  }).formatToParts(date);

  const day = parts.find((p) => p.type === 'day')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const min = parts.find((p) => p.type === 'minute')?.value;
  const sec = parts.find((p) => p.type === 'second')?.value;
  let offset = parts.find((p) => p.type === 'timeZoneName')?.value;
  let tz = '';

  if (offset) {
    tz = offset.split('-')[0];
    offset = offset.split('-')[1];
  }

  return [
    `${day} ${month} ${year}`,
    `${hour}:${min}:${sec} UTC-${offset} (${tz})`,
  ];
}

const formats: { [key in Formats]: (date: Date) => string } = {
  short: (date) =>
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(date),
  full: (date) => getFullTimestampParts(date).join(),
};

export default function FormattedDate({
  date,
  format = 'short',
  className,
}: {
  date: Date;
  format?: Formats;
  className?: string;
}) {
  const [fullDay, fullTime] = getFullTimestampParts(date);
  const dateString = formats[format](date);

  return (
    <ClientOnly>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={className}>{dateString}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="flex gap-1">
              <span>{fullDay}</span>
              <span className="text-primary">{fullTime}</span>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </ClientOnly>
  );
}
