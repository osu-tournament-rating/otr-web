import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import CountryFlag from '../shared/CountryFlag';
import { cn } from '@/lib/utils';

interface CountrySearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  countries: { code: string; name: string }[];
}

export function CountrySearchSelect({
  value,
  onValueChange,
  countries,
}: CountrySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      country.code.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Sort countries: selected first, then alphabetically
  const sortedCountries = [...filteredCountries].sort((a, b) => {
    if (a.code === value) return -1;
    if (b.code === value) return 1;
    return a.name.localeCompare(b.name);
  });

  const selectedCountry = countries.find((country) => country.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCountry ? (
            <div className="flex items-center gap-2">
              <CountryFlag country={selectedCountry.code} />
              <span className="truncate">{selectedCountry.name}</span>
            </div>
          ) : (
            'Select country...'
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <CommandInput
              placeholder="Search countries..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {sortedCountries.map((country) => (
              <CommandItem
                key={country.code}
                value={`${country.name} ${country.code}`}
                onSelect={() => {
                  // If clicking the selected country, deselect it
                  if (country.code === value) {
                    onValueChange('');
                  } else {
                    onValueChange(country.code);
                  }
                  setOpen(false);
                  setSearchValue('');
                }}
                className={cn(
                  'flex items-center gap-2',
                  country.code === value && 'bg-accent text-accent-foreground'
                )}
              >
                <CountryFlag country={country.code} />
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
