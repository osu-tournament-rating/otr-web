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
}: FieldMultiSelectProps) {
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

  const handleUnselect = (value: string) => {
    onChange(selected.filter((v) => v !== value));
  };

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Get option by value for display
  const getOption = (value: string) => options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-9 w-[180px] justify-between',
            selected.length > 0 && 'h-auto min-h-9',
            className
          )}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.map((value) => {
                const option = getOption(value);
                if (!option) return null;
                return (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="gap-1 py-0.5 pr-1"
                  >
                    <span>{option.label}</span>
                    <span className="text-muted-foreground">({option.entityLabel})</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      className="ring-offset-background focus:ring-ring ml-0.5 cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUnselect(value);
                      }}
                    >
                      <X className="text-muted-foreground hover:text-foreground h-3 w-3" />
                    </span>
                  </Badge>
                );
              })
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
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
  );
}
