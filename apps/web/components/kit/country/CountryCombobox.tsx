'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { CountryFlag, CountryName } from '@/components/kit/country/CountryFlag';
import { Button, type ButtonProps } from '@/components/kit/controls/Button';
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
import {
  type CountryOption,
  filterCountryOptions,
  getCountryName,
} from '@/lib/kit/format/country';
import { cn } from '@/lib/utils';

/**
 * A searchable country picker for filters, such as the leaderboard's. The
 * button shows the chosen country's flag and name; the list searches names
 * (accents and case ignored), older names such as `Turkey`, and exact codes,
 * with the chosen country first and the closest matches next.
 * Choosing it again clears the choice. Pass `countries` from the server
 * (`getCountryOptions()`), so every name matches the server's.
 */
export function CountryCombobox({
  value,
  onValueChange,
  countries,
  placeholder = 'Any country',
  searchPlaceholder = 'Search countries',
  emptyText = 'No country found.',
  className,
  ...props
}: {
  /** The chosen code, or an empty string for none. */
  value: string;
  /** Called with the chosen code, or an empty string when it is cleared. */
  onValueChange: (code: string) => void;
  /** Every country to offer, sorted by name: `getCountryOptions()` on the server. */
  countries: readonly CountryOption[];
  /** The button text when nothing is chosen. */
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
} & Omit<
  ButtonProps,
  'value' | 'onClick' | 'variant' | 'size' | 'icon' | 'children'
>) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');

  const selected = value
    ? (countries.find((country) => country.code === value) ?? {
        // A code the list does not offer, from an old address.
        code: value,
        name: getCountryName(value),
      })
    : undefined;
  const options = filterCountryOptions(countries, term, value);

  function choose(code: string) {
    onValueChange(code === value ? '' : code);
    setOpen(false);
    setTerm('');
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTerm('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
          {...props}
        >
          {selected ? (
            <CountryName
              code={selected.code}
              name={selected.name}
              size="sm"
              truncate
            />
          ) : (
            <span className="truncate text-muted-foreground">
              {placeholder}
            </span>
          )}
          <ChevronDown
            className="ml-2 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={term}
            onValueChange={setTerm}
          />
          <CommandList className="max-h-56">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((country) => {
                const isSelected = country.code === value;
                return (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    onSelect={() => choose(country.code)}
                    data-selected-country={isSelected || undefined}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <CountryFlag
                      code={country.code}
                      name={country.name}
                      size="sm"
                      decorative
                    />
                    <span className="min-w-0 truncate">
                      {country.name}
                      {isSelected ? (
                        <span className="sr-only"> (selected)</span>
                      ) : null}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {country.code}
                      <Check
                        aria-hidden
                        className={cn(
                          'size-4 text-foreground',
                          !isSelected && 'invisible'
                        )}
                      />
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
