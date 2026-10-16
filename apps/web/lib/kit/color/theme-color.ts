/**
 * What a colour has to stay legible as: `text` needs 4.5:1, `mark` (icons,
 * chart fills, lines, dots) needs 3:1, and `surface` and `border` are judged
 * by the text and marks drawn on them instead.
 */
export type ColorRole = 'text' | 'mark' | 'surface' | 'border';

/** A theme token from globals.css with the values it holds in each theme. */
export interface ThemeColor {
  /** The custom property, such as `--series-1`. */
  token: string;
  /** `var(--series-1)`, ready for a style or a Recharts `fill`. */
  css: string;
  light: string;
  dark: string;
  role: ColorRole;
}

export function themeColor(
  token: string,
  light: string,
  dark: string,
  role: ColorRole
): ThemeColor {
  return { token, css: `var(${token})`, light, dark, role };
}
