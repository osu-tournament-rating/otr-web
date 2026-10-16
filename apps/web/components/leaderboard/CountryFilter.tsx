'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/kit/controls/Button';
import CountryFlag from '@/components/shared/CountryFlag';
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
import { cn } from '@/lib/utils';

import type { CountryOption } from './countries';

interface CountrySearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  countries: readonly CountryOption[];
}

/**
 * A searchable list of countries for the leaderboard's country filter. The
 * button names the chosen country; its filter field names the group.
 * Choosing the selected country again clears it.
 */
export function CountrySearchSelect({
  value,
  onValueChange,
  countries,
}: CountrySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedCountry = countries.find((country) => country.code === value);
  const term = searchValue.toLowerCase();
  const filteredCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(term) ||
      country.code.toLowerCase().includes(term)
  );

  const sortedCountries = [...filteredCountries].sort((a, b) => {
    if (a.code === value) return -1;
    if (b.code === value) return 1;
    return a.name.localeCompare(b.name, 'en');
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="leaderboard-filter-country-button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedCountry ? (
            <span className="flex min-w-0 items-center gap-2">
              <CountryFlag country={selectedCountry.code} showTooltip={false} />
              <span className="truncate">{selectedCountry.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Any country</span>
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
            placeholder="Search countries"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup className="max-h-56 overflow-auto">
            {sortedCountries.map((country) => (
              <CommandItem
                key={country.code}
                value={`${country.name} ${country.code}`}
                onSelect={() => {
                  onValueChange(value === country.code ? '' : country.code);
                  setOpen(false);
                  setSearchValue('');
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-2',
                  country.code === value && 'bg-accent text-accent-foreground'
                )}
              >
                <CountryFlag country={country.code} showTooltip={false} />
                <span className="truncate">{country.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {country.code}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
