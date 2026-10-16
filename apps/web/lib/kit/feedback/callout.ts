import { Info, OctagonAlert, TriangleAlert } from 'lucide-react';

import type { CalloutTone } from '@/lib/kit/color/tokens';
import type { KitIcon } from '@/lib/kit/layout/icon';

export type { CalloutTone };

/** Fill, border and text-plus-icon classes for each callout tone. */
export const CALLOUT_TONE_CLASSES: Readonly<Record<CalloutTone, string>> = {
  info: 'border-callout-info-border bg-callout-info text-callout-info-foreground',
  warning:
    'border-callout-warning-border bg-callout-warning text-callout-warning-foreground',
  danger:
    'border-callout-danger-border bg-callout-danger text-callout-danger-foreground',
};

/** Each tone has its own glyph, so the tone still reads without colour. */
export const CALLOUT_TONE_ICONS: Readonly<Record<CalloutTone, KitIcon>> = {
  info: Info,
  warning: TriangleAlert,
  danger: OctagonAlert,
};

export const CALLOUT_TONES: readonly CalloutTone[] = [
  'info',
  'warning',
  'danger',
];
