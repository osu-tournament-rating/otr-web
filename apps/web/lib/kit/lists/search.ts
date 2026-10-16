/**
 * One search behaviour for every list and the header search.
 *
 * Why 400ms: most people leave 150–300ms between keystrokes, so 400ms waits
 * out a word in progress and sends one query per pause instead of one per
 * letter. It is also 200ms sooner than the lists' old 600ms, and with the
 * server render on top, results still land within about a second of the
 * last keystroke, the limit for a response to feel connected to the typing.
 * (The header search used 500ms.)
 */
export const SEARCH_DEBOUNCE_MS = 400;

/** One character matches too much to be worth a query. */
export const MIN_SEARCH_LENGTH = 2;

/** Mirrors the search procedures' input limit. */
export const MAX_SEARCH_LENGTH = 200;

/** The term a search actually sends: trimmed, or empty when too short. */
export function normalizeSearchTerm(
  text: string | null | undefined,
  minLength: number = MIN_SEARCH_LENGTH
): string {
  const trimmed = text?.trim() ?? '';
  return trimmed.length >= minLength ? trimmed : '';
}

/** True while someone has typed something, but not enough to search. */
export function isBelowSearchMinimum(
  text: string | null | undefined,
  minLength: number = MIN_SEARCH_LENGTH
): boolean {
  const length = text?.trim().length ?? 0;
  return length > 0 && length < minLength;
}

/** The hint shown under a field while the term is too short. */
export function getSearchMinimumHint(
  minLength: number = MIN_SEARCH_LENGTH
): string {
  return `Type at least ${minLength} characters to search.`;
}
