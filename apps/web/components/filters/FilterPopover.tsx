'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useMemo, useRef, type ReactNode } from 'react';

import FilterChip from '@/components/filters/FilterChip';
import FilterRangeField, {
  FilterEscapeContext,
  type EscapeConsumer,
  type FilterFieldBase,
  type FilterRangeFieldDescriptor,
} from '@/components/filters/FilterRangeField';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type {
  FilterFieldBase,
  FilterRangeFieldDescriptor,
  FilterRangeValue,
} from '@/components/filters/FilterRangeField';

export interface FilterOption {
  value: number;
  label: string;
}

export interface FilterMultiSelectField extends FilterFieldBase {
  kind: 'multi-select';
  options: readonly FilterOption[];
  /** Selected option values; bitwise fields expand their flags first. */
  value: readonly number[];
  placeholder: string;
  onChange: (value: number, checked: boolean) => void;
}

export interface FilterChipOption {
  /** Stable key because `value` is undefined for the "any" chip. */
  key: string;
  value?: number;
  label: string;
  icon?: ReactNode;
}

export interface FilterChipGroupField extends FilterFieldBase {
  kind: 'chip-group';
  options: readonly FilterChipOption[];
  value?: number;
  onChange: (value?: number) => void;
}

export interface FilterDateRangeField extends FilterFieldBase {
  kind: 'date-range';
  value: { from?: string; to?: string };
  onChange: (next: { from?: string; to?: string }) => void;
}

export type FilterField =
  | FilterRangeFieldDescriptor
  | FilterMultiSelectField
  | FilterChipGroupField
  | FilterDateRangeField;

export interface FilterPopoverProps {
  title: string;
  fields: readonly FilterField[];
  testIdPrefix: string;
  activeCount: number;
  onClearAll: () => void;
  /** The trigger, kept caller-owned so each page keeps its own affordance. */
  children: ReactNode;
}

export default function FilterPopover({
  title,
  fields,
  testIdPrefix,
  activeCount,
  onClearAll,
  children,
}: FilterPopoverProps) {
  const titleId = useId();
  const escapeConsumers = useRef(new Set<EscapeConsumer>());
  const escapeContext = useMemo(
    () => ({
      register: (consumer: EscapeConsumer) => {
        escapeConsumers.current.add(consumer);
        return () => {
          escapeConsumers.current.delete(consumer);
        };
      },
    }),
    []
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        data-testid={`${testIdPrefix}-filter-popover`}
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        // A field reverting an in-flight edit claims Escape; the popover only
        // closes once nothing is mid-edit.
        onEscapeKeyDown={(event) => {
          for (const consume of escapeConsumers.current) {
            if (consume()) {
              event.preventDefault();
              return;
            }
          }
        }}
        // Radix gives PopoverContent no accessible name of its own.
        aria-labelledby={titleId}
        className="flex max-h-[min(40rem,var(--radix-popover-content-available-height))] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 id={titleId} className="text-sm font-medium">
            {title}
          </h2>
          <Button
            data-testid={`${testIdPrefix}-filter-clear`}
            type="button"
            variant="ghost"
            size="sm"
            disabled={activeCount === 0}
            onClick={onClearAll}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            Clear all
          </Button>
        </div>

        <FilterEscapeContext.Provider value={escapeContext}>
          {/* `data-filter-fields` is FILTER_FIELD_SCOPE_ATTRIBUTE: it tells the
              deferred apply which inputs are filter boxes to wait on. */}
          <div
            data-filter-fields=""
            className="grid flex-1 grid-cols-2 gap-x-3 gap-y-4 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {fields.map((field) => (
              <FilterFieldGroup
                key={field.id}
                field={field}
                testIdPrefix={testIdPrefix}
              />
            ))}
          </div>
        </FilterEscapeContext.Provider>
      </PopoverContent>
    </Popover>
  );
}

function FilterFieldGroup({
  field,
  testIdPrefix,
}: {
  field: FilterField;
  testIdPrefix: string;
}) {
  const labelId = `${testIdPrefix}-${field.id}-label`;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      data-testid={`${testIdPrefix}-${field.id}`}
      className={cn(
        'min-w-0 space-y-2',
        field.span === 'half' ? 'col-span-1' : 'col-span-2',
        field.className
      )}
    >
      {field.kind === 'range' ? (
        // The range field owns its label so it can sit inline with the boxes.
        <FilterRangeField
          field={field}
          idPrefix={testIdPrefix}
          labelId={labelId}
        />
      ) : (
        <>
          <span id={labelId} className="block text-sm font-medium">
            {field.label}
          </span>
          {field.description ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {field.description}
            </p>
          ) : null}
          <FilterFieldControl field={field} testIdPrefix={testIdPrefix} />
        </>
      )}
    </div>
  );
}

function FilterFieldControl({
  field,
  testIdPrefix,
}: {
  field: Exclude<FilterField, FilterRangeFieldDescriptor>;
  testIdPrefix: string;
}) {
  const prefix = `${testIdPrefix}-${field.id}`;

  switch (field.kind) {
    case 'multi-select':
      return <MultiSelectDropdown field={field} testId={`${prefix}-trigger`} />;

    case 'chip-group':
      return (
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((option) => (
            <FilterChip
              key={option.key}
              label={option.label}
              icon={option.icon}
              selected={field.value === option.value}
              onClick={() => field.onChange(option.value)}
              data-testid={`${prefix}-${option.key}`}
            />
          ))}
        </div>
      );

    case 'date-range': {
      // No caption rows: they cost 40px and the group label plus the native
      // date placeholder already read clearly.
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input
            id={`${prefix}-from`}
            type="date"
            aria-label={`${field.label}, From`}
            value={field.value.from ?? ''}
            max={field.value.to}
            onChange={(event) =>
              field.onChange({
                ...field.value,
                from: event.target.value || undefined,
              })
            }
            className="h-8 min-w-0 px-2"
          />
          <Input
            id={`${prefix}-to`}
            type="date"
            aria-label={`${field.label}, Through`}
            value={field.value.to ?? ''}
            min={field.value.from}
            onChange={(event) =>
              field.onChange({
                ...field.value,
                to: event.target.value || undefined,
              })
            }
            className="h-8 min-w-0 px-2"
          />
        </div>
      );
    }
  }
}

function MultiSelectDropdown({
  field,
  testId,
}: {
  field: FilterMultiSelectField;
  testId: string;
}) {
  const selectedLabels = field.options
    .filter((option) => field.value.includes(option.value))
    .map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? field.placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-testid={testId}
          aria-label={`${field.label}: ${summary}`}
          className="w-full justify-between bg-background font-normal dark:bg-input/50 dark:shadow-none"
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {field.options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={field.value.includes(option.value)}
            onCheckedChange={(checked) =>
              field.onChange(option.value, checked === true)
            }
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
