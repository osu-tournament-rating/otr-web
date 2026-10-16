import type { VerificationStatus } from '@otr/core/osu';

import {
  getRatingsGroup,
  getVerificationStatusHue,
  type StatusHue,
} from '@/lib/kit/status/verification';

import { themeColor, type ThemeColor } from './theme-color';

/**
 * Verification colours for icons and chart fills, keyed by the status hue
 * from `@/lib/kit/status/verification`. Colour only reinforces the status
 * glyph; it never carries the status alone.
 */
export const VERIFICATION_COLORS: Readonly<Record<StatusHue, ThemeColor>> = {
  success: themeColor('--verification-verified', '#25984d', '#47c86e', 'mark'),
  neutral: themeColor('--verification-neutral', '#7a7a7a', '#929292', 'mark'),
  destructive: themeColor(
    '--verification-rejected',
    '#d73431',
    '#f66d67',
    'mark'
  ),
};

export function getStatusHueColor(hue: StatusHue): string {
  return VERIFICATION_COLORS[hue].css;
}

/** The icon colour of one status: Pre-verified is green, Pre-rejected red. */
export function getVerificationStatusColor(status: VerificationStatus): string {
  return getStatusHueColor(getVerificationStatusHue(status));
}

/**
 * The fill for a status in a chart, where Pending, Pre-verified and
 * Pre-rejected are one neutral "Not in ratings yet" bar.
 */
export function getRatingsGroupColor(status: VerificationStatus): string {
  return getStatusHueColor(getRatingsGroup(status).hue);
}
