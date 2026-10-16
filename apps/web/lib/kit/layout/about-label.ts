/**
 * A sentence-case name as it reads inside a sentence: "circle size" for
 * "Circle size", "rating history" for "Rating history". A name whose first
 * word is a short form or an osu! term keeps its spelling ("HP drain",
 * "API keys", "osu! player IDs").
 */
export function midSentence(text: string): string {
  return /^[A-Z][a-z]/.test(text)
    ? text.charAt(0).toLowerCase() + text.slice(1)
    : text;
}

/**
 * The accessible name of an info button that explains `subject`, such as
 * "About rating history", the way hand-written names read
 * ("About lobby size").
 */
export function aboutLabel(subject: string): string {
  return `About ${midSentence(subject)}`;
}
