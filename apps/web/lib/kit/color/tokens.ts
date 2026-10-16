import { CATEGORICAL_OTHER, CATEGORICAL_PALETTE } from './categorical';
import { GRADE_PALETTE } from './grades';
import { MOD_PALETTE } from './mods';
import type { Surface } from './surfaces';
import { MATCH_SURFACES, MATCH_TEAM_COLORS } from './teams';
import { themeColor, type ThemeColor } from './theme-color';
import { TIER_PALETTE } from './tiers';
import { VERIFICATION_COLORS } from './verification';
import { Team } from '@otr/core/osu';

export type CalloutTone = 'info' | 'warning' | 'danger';

export interface CalloutColors {
  fill: ThemeColor;
  border: ThemeColor;
  /** Body text and the tone's icon. */
  foreground: ThemeColor;
}

function callout(
  tone: CalloutTone,
  [fillLight, fillDark]: [string, string],
  [borderLight, borderDark]: [string, string],
  [textLight, textDark]: [string, string]
): CalloutColors {
  return {
    fill: themeColor(`--callout-${tone}`, fillLight, fillDark, 'surface'),
    border: themeColor(
      `--callout-${tone}-border`,
      borderLight,
      borderDark,
      'border'
    ),
    foreground: themeColor(
      `--callout-${tone}-foreground`,
      textLight,
      textDark,
      'text'
    ),
  };
}

/**
 * Callout tones. Info is a quiet slate rather than the link blue, so a notice
 * never reads as something to click.
 */
export const CALLOUT_COLORS: Readonly<Record<CalloutTone, CalloutColors>> = {
  info: callout(
    'info',
    ['#f0f6fc', '#1b2026'],
    ['#c9daeb', '#344458'],
    ['#314968', '#bcd3f2']
  ),
  warning: callout(
    'warning',
    ['#fff6e1', '#2b1f0d'],
    ['#ebc573', '#724d0b'],
    ['#864900', '#f8cf68']
  ),
  danger: callout(
    'danger',
    ['#fff1f1', '#301717'],
    ['#f9bcb9', '#893130'],
    ['#b7191c', '#ff9e9b']
  ),
};

/**
 * The brand blue. `--primary` colours icons, borders, rings and selection: in
 * light mode it is darkened so white text on it reaches 4.5:1, and in dark mode
 * it stays the original blue. `--primary-solid` is the fill behind white text
 * in both themes, and `--link` colours blue text.
 */
export const PRIMARY_COLOR: ThemeColor = themeColor(
  '--primary',
  'oklch(0.575 0.182 262.51)',
  'oklch(0.67 0.17 258.51)',
  'mark'
);

/** Blue link text: 4.5:1 or better on every surface in both themes. */
export const LINK_COLOR: ThemeColor = themeColor(
  '--link',
  'oklch(0.547 0.174 262.51)',
  'oklch(0.67 0.17 258.51)',
  'text'
);

export const PRIMARY_SOLID_COLOR: ThemeColor = themeColor(
  '--primary-solid',
  'oklch(0.575 0.182 262.51)',
  'oklch(0.575 0.182 262.51)',
  'mark'
);

/** The one colour for "something new" dots on menu items and avatars. */
export const NOTIFICATION_COLOR: ThemeColor = themeColor(
  '--notification',
  '#4589f2',
  '#4e93fc',
  'mark'
);

/** Body text. */
export const FOREGROUND_COLOR: ThemeColor = themeColor(
  '--foreground',
  'oklch(0 0 0)',
  'oklch(1 0 0)',
  'text'
);

/** Secondary text: labels, captions, table headers. 4.5:1 on every surface but accent. */
export const MUTED_TEXT_COLOR: ThemeColor = themeColor(
  '--muted-foreground',
  'oklch(0.53 0 0)',
  'oklch(0.69 0 0)',
  'text'
);

/**
 * Muted text on the accent surface, where `--muted-foreground` is under
 * 4.5:1. Tooltips apply it through `ACCENT_SURFACE_CLASSES`.
 */
export const ACCENT_MUTED_TEXT_COLOR: ThemeColor = themeColor(
  '--accent-muted-foreground',
  'oklch(0.5 0 0)',
  'oklch(0.75 0 0)',
  'text'
);

/** Red text: errors, falls in rating, destructive menu items. Tailwind red-800 and red-400. */
export const DESTRUCTIVE_TEXT_COLOR: ThemeColor = themeColor(
  '--destructive-foreground',
  'oklch(44.4% 0.177 26.899)',
  'oklch(70.4% 0.191 22.216)',
  'text'
);

/**
 * The tooltip surface: `bg-accent`, its text colour, and muted text scoped to
 * `--accent-muted-foreground`, so `text-muted-foreground` inside a tooltip
 * stays legible. The shadcn tooltip and TapTooltip's popover both use it.
 */
export const ACCENT_SURFACE_CLASSES =
  'bg-accent text-accent-foreground [--muted-foreground:var(--accent-muted-foreground)]';

export interface TokenEntry {
  color: ThemeColor;
  label: string;
  /** Tailwind class stem, such as `series-1`, when the token is registered. */
  utility?: string;
  /** The surface its contrast is measured on, when it is not the panel. */
  surface?: Surface;
}

export interface TokenGroup {
  id: string;
  title: string;
  entries: TokenEntry[];
}

const utilityOf = (color: ThemeColor) => color.token.slice(2);

/**
 * Every token the component library added to globals.css, and the theme text
 * colours it depends on, grouped as the gallery shows them.
 */
export const TOKEN_GROUPS: readonly TokenGroup[] = [
  {
    id: 'text',
    title: 'Text',
    entries: [
      { color: FOREGROUND_COLOR, label: 'Text', utility: 'foreground' },
      {
        color: MUTED_TEXT_COLOR,
        label: 'Muted text',
        utility: 'muted-foreground',
        surface: 'muted',
      },
      {
        color: ACCENT_MUTED_TEXT_COLOR,
        label: 'Muted text in a tooltip',
        utility: 'accent-muted-foreground',
        surface: 'accent',
      },
      {
        color: DESTRUCTIVE_TEXT_COLOR,
        label: 'Red text',
        utility: 'destructive-foreground',
        surface: 'muted',
      },
    ],
  },
  {
    id: 'categorical',
    title: 'Categorical chart palette',
    entries: [
      ...CATEGORICAL_PALETTE.map((color) => ({
        color,
        label: `${color.slot} ${color.name.toLowerCase()}`,
        utility: utilityOf(color),
      })),
      {
        color: CATEGORICAL_OTHER,
        label: 'Other',
        utility: utilityOf(CATEGORICAL_OTHER),
      },
    ],
  },
  {
    id: 'verification',
    title: 'Verification status',
    entries: [
      { color: VERIFICATION_COLORS.success, label: 'Verified' },
      { color: VERIFICATION_COLORS.neutral, label: 'Not in ratings yet' },
      { color: VERIFICATION_COLORS.destructive, label: 'Rejected' },
    ].map((entry) => ({ ...entry, utility: utilityOf(entry.color) })),
  },
  {
    id: 'callouts',
    title: 'Callout tones',
    entries: (['info', 'warning', 'danger'] as const).flatMap((tone) => {
      const { fill, border, foreground } = CALLOUT_COLORS[tone];
      const name = tone[0].toUpperCase() + tone.slice(1);
      return [
        { color: fill, label: `${name} fill` },
        { color: border, label: `${name} border` },
        { color: foreground, label: `${name} text` },
      ].map((entry) => ({ ...entry, utility: utilityOf(entry.color) }));
    }),
  },
  {
    id: 'match',
    title: 'Match teams and surfaces',
    entries: [
      { color: MATCH_TEAM_COLORS[Team.Red].mark, label: 'Red team' },
      { color: MATCH_TEAM_COLORS[Team.Red].text, label: 'Red team text' },
      { color: MATCH_TEAM_COLORS[Team.Blue].mark, label: 'Blue team' },
      { color: MATCH_TEAM_COLORS[Team.Blue].text, label: 'Blue team text' },
      { color: MATCH_TEAM_COLORS[Team.NoTeam].mark, label: 'No team' },
      { color: MATCH_SURFACES.gameFrame, label: 'Game frame' },
      { color: MATCH_SURFACES.scoreCard, label: 'Score card' },
    ].map((entry) => ({ ...entry, utility: utilityOf(entry.color) })),
  },
  {
    id: 'brand',
    title: 'Brand blue',
    entries: [
      {
        color: PRIMARY_COLOR,
        label: 'Blue icons, borders and selection',
        utility: 'primary',
      },
      { color: LINK_COLOR, label: 'Blue link text', utility: 'link' },
      {
        color: PRIMARY_SOLID_COLOR,
        label: 'Blue fill behind white text',
        utility: 'primary-solid',
      },
    ],
  },
  {
    id: 'accent',
    title: 'Notification',
    entries: [
      {
        color: NOTIFICATION_COLOR,
        label: 'Notification dot',
        utility: utilityOf(NOTIFICATION_COLOR),
      },
    ],
  },
  {
    id: 'tiers',
    title: 'Tiers',
    entries: Object.entries(TIER_PALETTE).map(([label, color]) => ({
      color,
      label,
      utility: utilityOf(color),
    })),
  },
  {
    id: 'grades',
    title: 'Score grades',
    entries: Object.entries(GRADE_PALETTE).map(([label, color]) => ({
      color,
      label,
    })),
  },
  {
    id: 'mods',
    title: 'Mods',
    entries: MOD_PALETTE.map((color) => ({ color, label: color.label })),
  },
];

/** Every token above, flattened. */
export const ALL_TOKENS: readonly ThemeColor[] = TOKEN_GROUPS.flatMap((group) =>
  group.entries.map((entry) => entry.color)
);
