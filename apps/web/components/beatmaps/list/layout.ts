/**
 * Card-grid layout shared by the beatmap list and its loading skeleton so the
 * silhouette matches the streamed-in content exactly.
 *
 * Two columns is the widest the grid goes: a card needs roughly 430px of text
 * width to hold bpm, duration, games, tournaments, and two mod pills on one
 * row, and a third column drops that below 300px.
 */
export const BEATMAP_CARD_GRID_CLASS =
  'grid auto-rows-fr grid-cols-1 gap-3 p-3 md:gap-4 md:p-4 lg:grid-cols-2';
