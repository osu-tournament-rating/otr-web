/**
 * The surfaces palette colours are checked against, resolved from
 * globals.css (a test keeps them in sync). In dark mode a panel is
 * `bg-muted/75` over the page background, which is lighter than `--card`, so
 * it is the harder surface to clear.
 */
export const SURFACES = {
  light: {
    /** `--card`, the panel surface. */
    card: '#f8f8f8',
    /** `--muted`: tiles, popovers and hover rows. */
    muted: '#f2f2f2',
    /** `--popover`: popovers, menus and filter panels. */
    popover: '#f2f2f2',
    /** `--accent`: tooltips, tap tooltips and hover fills. */
    accent: '#e4e4e4',
  },
  dark: {
    /** `--muted` at 75% over `--background`, the panel surface. */
    card: '#1b1b1b',
    /** `--muted`: tiles, popovers and hover rows. */
    muted: '#1f1f1f',
    /** `--popover`: popovers, menus and filter panels. */
    popover: '#1d1d1d',
    /** `--accent`: tooltips, tap tooltips and hover fills. */
    accent: '#3a3a3a',
  },
} as const;

export type Theme = keyof typeof SURFACES;

export type Surface = keyof (typeof SURFACES)[Theme];

/** `--foreground` and `--muted-foreground` of each theme, also kept in sync by a test. */
export const TEXT_COLORS: Readonly<
  Record<Theme, { foreground: string; muted: string }>
> = {
  light: { foreground: '#000000', muted: '#6c6c6c' },
  dark: { foreground: '#ffffff', muted: '#9b9b9b' },
};
