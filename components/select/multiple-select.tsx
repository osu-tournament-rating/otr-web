'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export type Option<TValue extends string = string> = {
  label: string;
  value: TValue;
  disabled?: boolean;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  badgeClassName?: string;
  disabled?: boolean;
  maxDisplayItems?: number;
  invalid?: boolean;
}

export function MultipleSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
  className,
  badgeClassName,
  disabled = false,
  maxDisplayItems = 3,
  invalid,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleUnselect = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const displayedItems = selected.slice(0, maxDisplayItems);
  const extraItemsCount = selected.length - maxDisplayItems;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            'h-auto min-h-10 w-full justify-between px-3 py-2',
            'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
            selected.length > 0 ? 'pl-3' : 'pl-4',
            className
          )}
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <div className="mr-2 flex flex-wrap gap-1">
            {selected.length > 0 ? (
              <>
                {displayedItems.map((value) => (
                  <Badge
                    key={value}
                    variant="secondary"
                    className={cn(
                      'mb-1 mr-1 px-1 py-0 text-xs font-normal',
                      badgeClassName
                    )}
                  >
                    {options.find((option) => option.value === value)?.label ||
                      value}
                    <span
                      role="button"
                      tabIndex={0}
                      className="ring-offset-background focus:ring-ring ml-1 cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUnselect(value);
                        }
                      }}
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
                ))}
                {extraItemsCount > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'mb-1 mr-1 px-1 py-0 text-xs font-normal',
                      badgeClassName
                    )}
                  >
                    +{extraItemsCount} more
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command className="w-full">
          <CommandInput
            placeholder="Search options..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9"
          />
          {selected.length > 0 && (
            <div className="flex items-center justify-between border-b px-2 py-1">
              <div className="text-muted-foreground text-xs">
                {selected.length} selected
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs"
                onClick={handleClearAll}
              >
                Clear all
              </Button>
            </div>
          )}
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <ScrollArea className="max-h-[300px] overflow-auto">
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      onSelect={() => {
                        onChange(
                          isSelected
                            ? selected.filter((item) => item !== option.value)
                            : [...selected, option.value]
                        );
                        setSearchQuery('');
                      }}
                    >
                      <div
                        className={cn(
                          'border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span>{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
