import { getAllCountries } from 'countries-and-timezones';

export interface CountryOption {
  code: string;
  name: string;
}

/** Every country the filter offers, by name. */
export const COUNTRY_OPTIONS: readonly CountryOption[] = Object.entries(
  getAllCountries()
)
  .map(([code, country]) => ({ code, name: country.name }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const COUNTRY_NAMES = new Map(
  COUNTRY_OPTIONS.map((country) => [country.code, country.name])
);

/**
 * "Poland" for `PL`, the same name the country filter shows; the code itself
 * when the list doesn't know it.
 */
export function getCountryName(code: string): string {
  return COUNTRY_NAMES.get(code) ?? code;
}
