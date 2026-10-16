/**
 * Reads a detail page's `?tab=` value; a repeated parameter uses its first
 * value. Anything that is not one of `tabs` (missing, misspelled, or from an
 * old link) falls back to `fallback`, so a bad link still opens the page.
 */
export function parseHeroTab<T extends string>(
  raw: string | string[] | undefined,
  tabs: readonly T[],
  fallback: T
): T {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return tabs.find((tab) => tab === value) ?? fallback;
}
