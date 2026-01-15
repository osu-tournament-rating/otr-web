'use client';

import { format, subDays } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
] as const;

interface DateRangeFilterProps {
  activityAfter?: string;
  activityBefore?: string;
  onChange: (after: string | undefined, before: string | undefined) => void;
}

export default function DateRangeFilter({
  activityAfter,
  activityBefore,
  onChange,
}: DateRangeFilterProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateRange: DateRange | undefined =
    activityAfter || activityBefore
      ? {
          from: activityAfter ? new Date(activityAfter) : undefined,
          to: activityBefore ? new Date(activityBefore) : undefined,
        }
      : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    onChange(range?.from?.toISOString(), range?.to?.toISOString());
  };

  const handlePreset = (days: number) => {
    const now = new Date();
    const from = subDays(now, days);
    onChange(from.toISOString(), now.toISOString());
  };

  const handleClear = () => {
    onChange(undefined, undefined);
  };

  const hasValue = activityAfter || activityBefore;

  const formatDateRange = () => {
    if (!hasValue) return 'Select dates...';

    const parts: string[] = [];
    if (activityAfter) {
      parts.push(`From ${format(new Date(activityAfter), 'MMM d, yyyy')}`);
    }
    if (activityBefore) {
      parts.push(`To ${format(new Date(activityBefore), 'MMM d, yyyy')}`);
    }
    return parts.join(' ');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {PRESETS.map((preset) => (
          <Button
            key={preset.days}
            variant="outline"
            size="sm"
            onClick={() => handlePreset(preset.days)}
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'flex-1 justify-start text-left font-normal',
                !hasValue && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 size-4" />
              <span className="truncate">{formatDateRange()}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {hasValue && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleClear}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
