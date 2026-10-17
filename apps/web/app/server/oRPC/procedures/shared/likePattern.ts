const LIKE_ESCAPE_PATTERN = /[%_\\]/g;

/** Escapes LIKE's wildcards and its default escape character, `\`. */
export const escapeLikePattern = (value: string) =>
  value.replace(LIKE_ESCAPE_PATTERN, (match) => `\\${match}`);

/** An ILIKE pattern that matches `term` anywhere in the value. */
export const containsPattern = (term: string) => `%${escapeLikePattern(term)}%`;
