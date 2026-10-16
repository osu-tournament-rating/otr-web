'use client';

import { DateField } from '@/components/kit/lists/DateField';
import {
  FilterField,
  type FilterFieldProps,
} from '@/components/kit/lists/FilterPanel';
import { normalizeDayRange, type DayRange } from '@/lib/kit/lists/params';

/**
 * A range of days, both ends inclusive, picked from two calendars ("From"
 * and "Through"). Days are UTC `YYYY-MM-DD`, the same as `dayRangeParam`.
 */
export function DayRangeFilter({
  value,
  onValueChange,
  min,
  max,
  ...field
}: FilterFieldProps & {
  value: DayRange;
  onValueChange: (value: DayRange) => void;
  /** Earliest and latest days that can be picked. */
  min?: string;
  max?: string;
}) {
  const change = (patch: DayRange) =>
    onValueChange(normalizeDayRange({ ...value, ...patch }));

  return (
    <FilterField {...field}>
      {/* Side by side from the width where a full date fits each half. */}
      <div className="grid grid-cols-1 gap-2 min-[22rem]:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            From
          </span>
          <DateField
            label="From"
            value={value.from}
            onValueChange={(from) => change({ from })}
            min={min}
            max={value.to ?? max}
            highlight={value}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            Through
          </span>
          <DateField
            label="Through"
            value={value.to}
            onValueChange={(to) => change({ to })}
            min={value.from ?? min}
            max={max}
            highlight={value}
          />
        </div>
      </div>
    </FilterField>
  );
}
