import { Team } from '@otr/core/osu';

import { CATEGORICAL_PALETTE } from './categorical';
import { themeColor, type ThemeColor } from './theme-color';

export interface TeamColors {
  /** Edges, swatches, chart lines and tints. */
  mark: ThemeColor;
  /** Team-coloured text, such as "Red wins by 12,345". */
  text: ThemeColor;
}

const RED = CATEGORICAL_PALETTE[7];
const BLUE = CATEGORICAL_PALETTE[0];
const NO_TEAM = themeColor('--match-no-team', '#747474', '#9e9e9e', 'mark');

/**
 * The one red and blue pair for match teams, taken from the categorical
 * palette, plus a neutral for scores with no team.
 */
export const MATCH_TEAM_COLORS: Readonly<Record<Team, TeamColors>> = {
  [Team.Red]: {
    mark: themeColor('--match-red', RED.light, RED.dark, 'mark'),
    text: themeColor('--match-red-foreground', '#cc3135', '#f17070', 'text'),
  },
  [Team.Blue]: {
    mark: themeColor('--match-blue', BLUE.light, BLUE.dark, 'mark'),
    text: themeColor('--match-blue-foreground', '#276bd1', '#579dff', 'text'),
  },
  [Team.NoTeam]: { mark: NO_TEAM, text: NO_TEAM },
};

/**
 * How strongly a score card is tinted with its team's mark. At 10% (today's
 * `ScoreCard`) muted text on the light card drops under 4.5:1; at 6% foreground,
 * muted and team text all clear it in both themes.
 */
export const MATCH_TEAM_TINT = 0.06;

/** The score card tint for each team, spelled out so Tailwind finds it. */
export const MATCH_TEAM_TINT_CLASS: Readonly<Record<Team, string>> = {
  [Team.Red]: 'bg-match-red/6',
  [Team.Blue]: 'bg-match-blue/6',
  [Team.NoTeam]: 'bg-match-no-team/6',
};

export function getTeamColor(team: Team): string {
  return (MATCH_TEAM_COLORS[team] ?? MATCH_TEAM_COLORS[Team.NoTeam]).mark.css;
}

export function getTeamTintClass(team: Team): string {
  return MATCH_TEAM_TINT_CLASS[team] ?? MATCH_TEAM_TINT_CLASS[Team.NoTeam];
}

/** Team text colour; scores with no team use the regular foreground. */
export function getTeamTextColor(team: Team): string {
  return team === Team.Red || team === Team.Blue
    ? MATCH_TEAM_COLORS[team].text.css
    : 'var(--foreground)';
}

/** The recessed game frame and the lighter score cards inside it. */
export const MATCH_SURFACES: Readonly<{
  gameFrame: ThemeColor;
  scoreCard: ThemeColor;
}> = {
  gameFrame: themeColor('--game-frame', '#f4f4f4', '#141414', 'surface'),
  scoreCard: themeColor('--score-card', '#ffffff', '#242424', 'surface'),
};
