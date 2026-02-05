'use client';

import * as React from 'react';
import { Check, X, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import type { FieldOption } from './auditFieldConfig';

interface FieldMultiSelectProps {
  options: FieldOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function FieldMultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = 'Select fields...',
  disabled = false,
  onClear,
}: FieldMultiSelectProps & { onClear?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;
    const lower = searchValue.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(lower) ||
        option.entityLabel.toLowerCase().includes(lower)
    );
  }, [options, searchValue]);

  // Group filtered options by entity type
  const groupedOptions = React.useMemo(() => {
    const groups = new Map<string, FieldOption[]>();
    for (const option of filteredOptions) {
      const group = groups.get(option.entityLabel) ?? [];
      group.push(option);
      groups.set(option.entityLabel, group);
    }
    return groups;
  }, [filteredOptions]);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Get option by value for display
  const getOption = (value: string) => options.find((o) => o.value === value);

  // Get display text for trigger
  const getTriggerText = () => {
    if (selected.length === 0) return placeholder;
    const firstOption = getOption(selected[0]);
    if (!firstOption) return placeholder;
    if (selected.length === 1) return firstOption.label;
    return `${firstOption.label} +${selected.length - 1}`;
  };

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'h-9 w-full justify-between',
              selected.length > 0 && onClear && 'pr-10'
            )}
            disabled={disabled}
          >
            <span
              className={cn(
                'truncate',
                selected.length === 0 && 'text-muted-foreground'
              )}
            >
              {getTriggerText()}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search fields..."
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-9"
          />
          <CommandEmpty>No field found.</CommandEmpty>
          <div className="max-h-[300px] overflow-auto">
            {Array.from(groupedOptions.entries()).map(([entityLabel, groupOptions]) => (
              <CommandGroup key={entityLabel} heading={entityLabel}>
                {groupOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selected.includes(option.value) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex-1">{option.label}</span>
                    <Badge
                      variant="outline"
                      className="ml-auto px-1.5 py-0 text-[10px]"
                    >
                      {option.entityLabel}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
    {selected.length > 0 && onClear && (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClear();
        }}
        className="text-muted-foreground hover:text-foreground hover:bg-muted absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors"
        aria-label="Clear field selection"
      >
        <X className="h-3 w-3" />
      </button>
    )}
    </div>
  );
}
