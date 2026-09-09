'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

/** The compact filter that sits in a section header's meta slot. */
export default function StatsSegmentedControl<T extends string>({
  value,
  options,
  onValueChange,
  label,
  'data-testid': testId,
}: {
  value: T;
  options: readonly SegmentedOption<T>[];
  onValueChange: (value: T) => void;
  /** Accessible name for the group, such as `Upset window`. */
  label: string;
  'data-testid'?: string;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      className="w-auto"
    >
      <TabsList aria-label={label} data-testid={testId} className="h-7 p-0.5">
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            data-testid={testId ? `${testId}-${option.value}` : undefined}
            className="flex-none px-2 text-xs"
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
