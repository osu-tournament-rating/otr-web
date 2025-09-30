'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

import { Check, X, ChevronsUpDown } from 'lucide-react';
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

export type Option<TValue extends string = string> = {
  label: string;
  value: TValue;
  disabled?: boolean;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange:
    | ((values: string[]) => void)
    | React.Dispatch<React.SetStateAction<string[]>>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
}

function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = 'Select options...',
  disabled = false,
  invalid,
  ...props
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [searchValue, setSearchValue] = React.useState('');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const commandRef = React.useRef<HTMLDivElement>(null);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [options, searchValue]);

  // Reset highlighted index when options change
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions]);

  // Focus management when popover opens/closes
  React.useEffect(() => {
    if (open) {
      setHighlightedIndex(-1);
      setSearchValue('');
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  const handleUnselect = (item: string) => {
    const newValues = selected.filter((i) => i !== item);
    onChange(newValues);
  };

  const handleSelect = (optionValue: string) => {
    const newValues = selected.includes(optionValue)
      ? selected.filter((item) => item !== optionValue)
      : [...selected, optionValue];
    onChange(newValues);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      // When closed, open on Enter, Space, or Arrow keys
      if (
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp'
      ) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    // When open, handle navigation
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const nextIndex = prev + 1;
          return nextIndex >= filteredOptions.length ? 0 : nextIndex;
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const nextIndex = prev - 1;
          return nextIndex < 0 ? filteredOptions.length - 1 : nextIndex;
        });
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredOptions.length
        ) {
          const option = filteredOptions[highlightedIndex];
          if (!option.disabled) {
            handleSelect(option.value);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;

      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    // Let the search input handle typing, but intercept navigation keys
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case 'Escape':
        handleKeyDown(e);
        break;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          aria-haspopup="listbox"
          aria-label={
            selected.length > 0
              ? `${selected.length} items selected`
              : placeholder
          }
          className={cn(
            'w-full justify-between',
            selected.length > 1 ? 'h-full' : 'h-9',
            'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
            className
          )}
          onClick={() => setOpen(!open)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.map((item) => (
                <Badge
                  variant="secondary"
                  key={item}
                  className="mb-1 mr-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnselect(item);
                  }}
                >
                  {options.find((option) => option.value === item)?.label ||
                    item}
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${item}`}
                    className="ring-offset-background focus:ring-ring ml-1 cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleUnselect(item);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(item);
                    }}
                  >
                    <X className="text-muted-foreground hover:text-foreground h-3 w-3" />
                  </span>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command ref={commandRef} shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={handleSearchKeyDown}
            className="h-9"
          />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup
            className="max-h-[200px] overflow-auto"
            role="listbox"
            onWheel={(e) => {
              // Allow wheel scrolling to work properly
              e.stopPropagation();
            }}
          >
            {filteredOptions.map((option, index) => (
              <CommandItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                data-highlighted={highlightedIndex === index}
                className={cn(
                  highlightedIndex === index &&
                    'bg-accent text-accent-foreground'
                )}
                onSelect={() => {
                  if (!option.disabled) {
                    handleSelect(option.value);
                  }
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={selected.includes(option.value)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selected.includes(option.value)
                      ? 'opacity-100'
                      : 'opacity-0'
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelect, MultiSelect as MultipleSelect };
