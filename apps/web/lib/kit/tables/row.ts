/**
 * The hover tint, for rows that open as a whole and nothing else: a tint
 * promises that a click anywhere on the row goes somewhere. Rows where only
 * the name links get no tint.
 */
export const ROW_HOVER_TINT =
  'transition-colors hover:bg-muted/40 dark:hover:bg-secondary/70';

/**
 * Goes on a row that opens as a whole, next to ROW_HOVER_TINT: the name
 * marked `data-row-title` turns blue while the row is hovered.
 */
export const ROW_TITLE_HOVER =
  '[&_[data-row-title]]:transition-colors hover:[&_[data-row-title]]:text-primary';

/** The signed-in player's own row, such as on the leaderboard. */
export const ROW_HIGHLIGHT = 'bg-primary/10';
