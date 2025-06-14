'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import ClientOnly from '../client-only';

type Formats = 'short' | 'full';

function getTimezoneOffset(timeZone: string): string {
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const target = new Date(utc.toLocaleString('en-US', { timeZone: 'UTC' }));
  const local = new Date(utc.toLocaleString('en-US', { timeZone }));

  const offsetMinutes = (local.getTime() - target.getTime()) / (1000 * 60);
  const offsetHours = Math.abs(offsetMinutes / 60);
  const sign = offsetMinutes >= 0 ? '+' : '-';

  return `UTC${sign}${Math.floor(offsetHours).toString().padStart(2, '0')}:${Math.abs(
    offsetMinutes % 60
  )
    .toString()
    .padStart(2, '0')}`;
}

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
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const day = parts.find((p) => p.type === 'day')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const min = parts.find((p) => p.type === 'minute')?.value;
  const sec = parts.find((p) => p.type === 'second')?.value;

  return [
    `${day} ${month} ${year}`,
    `${hour}:${min}:${sec} ${getTimezoneOffset(timezone)}`,
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
    </ClientOnly>
  );
}
