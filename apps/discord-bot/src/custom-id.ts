const VERSION = '1';

export type CustomId = {
  view: string;
  key: string;
  ruleset: number | null;
  page: number;
  country?: string;
};

export function encodeCustomId({
  view,
  key,
  ruleset,
  page,
  country,
}: CustomId): string {
  const parts = [VERSION, view, key, ruleset ?? '-', page];
  if (country) {
    parts.push(country);
  }
  return parts.join(':');
}

/** Null for another version or a malformed id. */
export function parseCustomId(raw: string): CustomId | null {
  const [version, view, key, ruleset, page, country, ...rest] = raw.split(':');
  if (
    version !== VERSION ||
    !view ||
    !key ||
    !ruleset ||
    !page ||
    rest.length > 0
  ) {
    return null;
  }

  const pageNumber = Number(page);
  const rulesetNumber = ruleset === '-' ? null : Number(ruleset);
  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    (rulesetNumber !== null && !Number.isInteger(rulesetNumber))
  ) {
    return null;
  }

  return {
    view,
    key,
    ruleset: rulesetNumber,
    page: pageNumber,
    ...(country ? { country } : {}),
  };
}
