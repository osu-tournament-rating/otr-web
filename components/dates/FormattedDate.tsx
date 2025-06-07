'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import ClientOnly from '../client-only';

type DateFormat = 'short' | 'medium' | 'full';

interface FormattedDateProps {
  date: Date;
  format?: DateFormat;
  className?: string;
  showTooltip?: boolean;
  locale?: string;
  timeZone?: string;
}

function getUserLocale(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.language || 'en-US';
  }
  return 'en-US';
}

function getUserTimeZone(): string {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return 'UTC';
}

function formatDate(
  date: Date,
  format: DateFormat,
  locale: string,
  timeZone: string
): string {
  const formatters: Record<DateFormat, Intl.DateTimeFormatOptions> = {
    short: {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    },
    medium: {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    },
    full: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      timeZone,
    },
  };

  return new Intl.DateTimeFormat(locale, formatters[format]).format(date);
}

function getTooltipContent(
  date: Date,
  locale: string,
  timeZone: string
): { date: string; time: string; utc: string } {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  });

  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    timeZone,
  });

  const utcFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    timeZone: 'UTC',
  });

  return {
    date: dateFormatter.format(date),
    time: timeFormatter.format(date),
    utc: utcFormatter.format(date),
  };
}

export default function FormattedDate({
  date,
  format = 'short',
  className,
  showTooltip = true,
  locale,
  timeZone,
}: FormattedDateProps) {
  const userLocale = locale || getUserLocale();
  const userTimeZone = timeZone || getUserTimeZone();

  const formattedDate = formatDate(date, format, userLocale, userTimeZone);
  const tooltipContent = getTooltipContent(date, userLocale, userTimeZone);

  const dateElement = (
    <time dateTime={date.toISOString()} className={className}>
      {formattedDate}
    </time>
  );

  if (!showTooltip) {
    return <ClientOnly>{dateElement}</ClientOnly>;
  }

  return (
    <ClientOnly>
      <Tooltip>
        <TooltipTrigger asChild>{dateElement}</TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-center">
            <div className="font-medium">{tooltipContent.date}</div>
            <div className="text-sm">{tooltipContent.time}</div>
            <div className="border-t pt-1 text-xs text-muted-foreground">
              {tooltipContent.utc}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </ClientOnly>
  );
}
