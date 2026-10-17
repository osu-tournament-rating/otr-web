/**
 * Country names and flags, from the country codes osu! stores on players.
 * Names are English, from `Intl.DisplayNames` with a fixed `en` locale, so
 * they never follow the visitor's language.
 *
 * Call these on the server and pass the result down. Browsers ship their own
 * region data, and some name a few regions differently (older ones still
 * write `Turkey` for `Türkiye`), so a name worked out again in the browser
 * can differ from the server's and break hydration.
 */

/** osu!'s code for a player with no known country. */
export const UNKNOWN_COUNTRY_CODE = 'XX';

/**
 * Every country a filter offers: the ISO 3166-1 alpha-2 codes, plus `XK`
 * (Kosovo), which osu! uses. Alphabetical by code; `getCountryOptions` sorts
 * them by name.
 */
export const COUNTRY_CODES: readonly string[] = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI
BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN
CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK
FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM
HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN
KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK
ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP
NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW
SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF
TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI
VN VU WF WS XK YE YT ZA ZM ZW
`
  .trim()
  .split(/\s+/);

/**
 * Codes some older osu! accounts carry that are not countries: `XX` and the
 * legacy GeoIP regions, named as MaxMind named them. `Intl` knows none of
 * them, or (for `EU`) means something else.
 */
const PSEUDO_REGION_NAMES: Readonly<Record<string, string>> = {
  [UNKNOWN_COUNTRY_CODE]: 'Unknown',
  A1: 'Anonymous proxy',
  A2: 'Satellite provider',
  AP: 'Asia/Pacific region',
  EU: 'Europe',
  O1: 'Other country',
};

/** Countries osu!'s flag set predates (2010 codes): they get the unknown flag. */
const CODES_WITHOUT_FLAG = new Set(['BQ', 'CW', 'SX']);

const FLAGGED_CODES = new Set(
  [...COUNTRY_CODES, ...Object.keys(PSEUDO_REGION_NAMES)].filter(
    (code) => !CODES_WITHOUT_FLAG.has(code)
  )
);

// One fixed locale: the visitor's language never comes into it.
const REGION_NAMES = new Intl.DisplayNames(['en'], {
  type: 'region',
  fallback: 'none',
});

/** `au` → `AU`; trims and upper-cases what the database or an address holds. */
export function normalizeCountryCode(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase();
}

/**
 * "Australia" for `AU`, "South Korea" for `KR`, "Unknown" for `XX` or no
 * code, and the code itself for one no table knows.
 */
export function getCountryName(code: string | null | undefined): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return PSEUDO_REGION_NAMES[UNKNOWN_COUNTRY_CODE];

  const pseudo = PSEUDO_REGION_NAMES[normalized];
  if (pseudo) return pseudo;

  try {
    return REGION_NAMES.of(normalized) ?? normalized;
  } catch {
    // Not a well-formed region code, such as `A1` or `USA`.
    return normalized;
  }
}

/**
 * Names for several codes at once, keyed by the code as given, for a server
 * component to hand to a client one (a match's score cards).
 */
export function getCountryNames(
  codes: Iterable<string | null | undefined>
): Record<string, string> {
  const names: Record<string, string> = {};
  for (const code of codes) {
    if (code) names[code] = getCountryName(code);
  }
  return names;
}

/**
 * osu!'s flag image for a code. Codes osu! has no flag for get its
 * "unknown" flag, so a bad value never shows a broken image.
 */
export function getCountryFlagUrl(code: string | null | undefined): string {
  const normalized = normalizeCountryCode(code);
  const flagged = FLAGGED_CODES.has(normalized)
    ? normalized
    : UNKNOWN_COUNTRY_CODE;
  return `https://assets.ppy.sh/old-flags/${flagged}.png`;
}

export interface CountryOption {
  code: string;
  name: string;
}

/** Every country in `COUNTRY_CODES` with its name, sorted by name. */
export function getCountryOptions(
  codes: readonly string[] = COUNTRY_CODES
): CountryOption[] {
  return codes
    .map((code) => ({ code, name: getCountryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/**
 * Names people search for that `Intl`'s English name does not contain: the
 * older or longer names (the leaderboard's previous list wrote `Ivory Coast`
 * and `United States of America`) and common short forms. Search only;
 * never shown.
 */
const SEARCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  AE: ['UAE'],
  CD: ['Democratic Republic of the Congo', 'DR Congo'],
  CG: ['Republic of the Congo'],
  CI: ['Ivory Coast'],
  CV: ['Cabo Verde'],
  CZ: ['Czech Republic'],
  GB: ['UK', 'Great Britain', 'England', 'Scotland', 'Wales'],
  MO: ['Macau'],
  NL: ['Holland'],
  PS: ['Palestine'],
  SZ: ['Swaziland'],
  TL: ['East Timor'],
  TR: ['Turkey'],
  US: ['USA', 'United States of America'],
  VA: ['Holy See'],
};

/**
 * Lower case, without accents, with straight apostrophes and every other
 * run of punctuation as one space, so "cote d'ivoire" finds "Côte d’Ivoire",
 * "sao tome" finds "São Tomé & Príncipe" and "guinea bissau" finds
 * "Guinea-Bissau".
 */
function foldForSearch(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim();
}

// The folded texts a country is found by, worked out once per option.
const searchKeys = new WeakMap<CountryOption, readonly string[]>();

function getSearchKeys(option: CountryOption): readonly string[] {
  let keys = searchKeys.get(option);
  if (!keys) {
    keys = [
      foldForSearch(option.name),
      // `Intl` abbreviates: "St. Kitts & Nevis" is also "saint kitts and nevis".
      foldForSearch(
        option.name.replace(/&/g, ' and ').replace(/\bSt\./g, 'Saint')
      ),
      ...(SEARCH_ALIASES[option.code] ?? []).map(foldForSearch),
    ];
    searchKeys.set(option, keys);
  }
  return keys;
}

/**
 * How well a country matches a folded query, best first: its exact code or
 * name (0), a name that starts with it (1), a word that does (2), or a name
 * that contains it (3). `undefined` when it does not match.
 */
function matchRank(option: CountryOption, query: string): number | undefined {
  const keys = getSearchKeys(option);
  if (option.code.toLowerCase() === query || keys.includes(query)) return 0;
  if (keys.some((key) => key.startsWith(query))) return 1;
  if (keys.some((key) => key.includes(` ${query}`))) return 2;
  if (keys.some((key) => key.includes(query))) return 3;
  return undefined;
}

/**
 * The options a country search shows, with the selected country first:
 * names, older names (`ivory coast`, `turkey`) and spelled-out forms
 * (`saint lucia`, `trinidad and tobago`) that contain the term, or the exact
 * code (`kr`). An exact code or name comes first, then names that start
 * with the term, then names with a word that does, then the rest; each group
 * keeps the given order.
 */
export function filterCountryOptions(
  options: readonly CountryOption[],
  term: string,
  selected?: string
): CountryOption[] {
  const query = foldForSearch(term);
  const matches = query
    ? options
        .map((option, index) => ({
          option,
          index,
          rank: matchRank(option, query),
        }))
        .filter(
          (match): match is typeof match & { rank: number } =>
            match.rank !== undefined
        )
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map((match) => match.option)
    : [...options];

  const index = selected
    ? matches.findIndex((option) => option.code === selected)
    : -1;
  if (index > 0) matches.unshift(...matches.splice(index, 1));
  return matches;
}
