import { describe, expect, it } from 'bun:test';

import {
  COUNTRY_CODES,
  filterCountryOptions,
  getCountryFlagUrl,
  getCountryName,
  getCountryNames,
  getCountryOptions,
  normalizeCountryCode,
} from '../country';

describe('getCountryName', () => {
  it('names a country in English', () => {
    expect(getCountryName('AU')).toBe('Australia');
    expect(getCountryName('KR')).toBe('South Korea');
    expect(getCountryName('XK')).toBe('Kosovo');
  });

  it('reads codes in any case and with stray spaces', () => {
    expect(getCountryName(' pl ')).toBe('Poland');
    expect(normalizeCountryCode(' pl ')).toBe('PL');
  });

  it("names osu!'s codes that are not countries", () => {
    expect(getCountryName('XX')).toBe('Unknown');
    expect(getCountryName('')).toBe('Unknown');
    expect(getCountryName(null)).toBe('Unknown');
    // Intl calls EU the European Union; for a GeoIP region it is Europe.
    expect(getCountryName('EU')).toBe('Europe');
    expect(getCountryName('A1')).toBe('Anonymous proxy');
  });

  it('falls back to the code for anything it cannot name', () => {
    expect(getCountryName('QZ')).toBe('QZ');
    expect(getCountryName('USA')).toBe('USA');
  });

  it('never follows the runtime locale', () => {
    // A German name would be "Deutschland".
    expect(getCountryName('DE')).toBe('Germany');
  });
});

describe('getCountryNames', () => {
  it('maps each code to its name and skips empty ones', () => {
    expect(getCountryNames(['JP', null, 'JP', 'US', ''])).toEqual({
      JP: 'Japan',
      US: 'United States',
    });
  });
});

describe('getCountryFlagUrl', () => {
  it("points at osu!'s flag", () => {
    expect(getCountryFlagUrl('jp')).toBe(
      'https://assets.ppy.sh/old-flags/JP.png'
    );
    expect(getCountryFlagUrl('AP')).toBe(
      'https://assets.ppy.sh/old-flags/AP.png'
    );
  });

  it('uses the unknown flag for codes osu! has no flag for', () => {
    // BQ, CW and SX (2010 codes) have no flag in osu!'s set.
    for (const code of ['', 'ZZ', 'USA', null, 'CW', 'BQ', 'SX']) {
      expect(getCountryFlagUrl(code)).toBe(
        'https://assets.ppy.sh/old-flags/XX.png'
      );
    }
  });
});

describe('country options', () => {
  const options = getCountryOptions();

  it('offers every ISO country and Kosovo, once each, all named', () => {
    expect(COUNTRY_CODES).toHaveLength(250);
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    for (const code of COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(getCountryName(code)).not.toBe(code);
    }
    expect(COUNTRY_CODES).toContain('XK');
    expect(COUNTRY_CODES).not.toContain('XX');
  });

  it('sorts by name', () => {
    const names = options.map((option) => option.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    expect(options[0].name).toBe('Afghanistan');
  });

  it('finds names without caring about case, accents or apostrophes', () => {
    expect(filterCountryOptions(options, "cote d'ivoire")).toEqual([
      { code: 'CI', name: getCountryName('CI') },
    ]);
    expect(
      filterCountryOptions(options, 'SAO TOME').map((option) => option.code)
    ).toEqual(['ST']);
  });

  it('finds a country by its exact code', () => {
    const codes = filterCountryOptions(options, 'kr').map(
      (option) => option.code
    );
    expect(codes).toContain('KR');
  });

  const codesFor = (term: string) =>
    filterCountryOptions(options, term).map((option) => option.code);

  it('puts an exact code or name first, then names that start with the term', () => {
    // "us" is inside Australia, Belarus, Cyprus and more; the code wins.
    const us = codesFor('us');
    expect(us[0]).toBe('US');
    expect(us).toContain('AU');

    // India by its code, then Indonesia by its start, then the rest.
    const india = codesFor('in');
    expect(india.slice(0, 2)).toEqual(['IN', 'ID']);
    expect(india.indexOf('AR')).toBeGreaterThan(india.indexOf('ID'));

    // A word that starts with the term beats one that only contains it.
    const korea = codesFor('korea');
    expect(korea).toEqual(['KP', 'KR']);
    // Guinea (exact), Guinea-Bissau (start), then Equatorial and Papua New Guinea.
    expect(codesFor('guinea')).toEqual(['GN', 'GW', 'GQ', 'PG']);
  });

  it('finds older names and spelled-out forms', () => {
    expect(codesFor('ivory coast')).toEqual(['CI']);
    expect(codesFor('Turkey')).toEqual(['TR']);
    expect(codesFor('united states of america')).toEqual(['US']);
    expect(codesFor('uk')[0]).toBe('GB');
    expect(codesFor('saint lucia')).toEqual(['LC']);
    expect(codesFor('st lucia')).toEqual(['LC']);
    expect(codesFor('trinidad and tobago')).toEqual(['TT']);
    expect(codesFor('trinidad & tobago')).toEqual(['TT']);
    expect(codesFor('guinea-bissau')).toEqual(['GW']);
  });

  it('puts the selected country first and keeps the rest in order', () => {
    const all = filterCountryOptions(options, '', 'PL');
    expect(all[0].code).toBe('PL');
    expect(all).toHaveLength(options.length);
    expect(all.slice(1).map((option) => option.code)).toEqual(
      options.filter((option) => option.code !== 'PL').map((o) => o.code)
    );
  });

  it('returns nothing for a term that matches nothing', () => {
    expect(filterCountryOptions(options, 'atlantis')).toEqual([]);
  });
});
