'use client';

import { useState } from 'react';

import { CountryCombobox } from '@/components/kit/country/CountryCombobox';
import { FilterField } from '@/components/kit/lists/FilterPanel';
import type { CountryOption } from '@/lib/kit/format/country';

/**
 * The country filter as the leaderboard's filter panel shows it. The options
 * come from the server, as on a page.
 */
export function CountryComboboxDemo({
  countries,
  initialValue = '',
}: {
  countries: readonly CountryOption[];
  initialValue?: string;
}) {
  const [country, setCountry] = useState(initialValue);

  return (
    <div className="grid max-w-72 grid-cols-2">
      <FilterField label="Country">
        <CountryCombobox
          value={country}
          onValueChange={setCountry}
          countries={countries}
        />
      </FilterField>
    </div>
  );
}
