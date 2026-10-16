import type * as React from 'react';

import { Badge } from '@/components/kit/status/Badge';
import TapTooltip from '@/components/tap-tooltip';
import {
  CALLOUT_TONE_CLASSES,
  CALLOUT_TONE_ICONS,
  type CalloutTone,
} from '@/lib/kit/feedback/callout';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/**
 * A short notice inside a panel, such as "Includes unverified" on a chart:
 * the callout's colours on a small outlined chip. `detail` explains it in a
 * tooltip that also opens on tap. Use Callout when the notice needs a
 * sentence.
 */
export function CalloutChip({
  tone = 'warning',
  icon,
  detail,
  size = 'md',
  children,
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'color'> & {
  tone?: CalloutTone;
  /** Replaces the tone's glyph, such as a shield for unverified data. */
  icon?: KitIcon;
  /** The explanation behind the chip. Makes the chip a button. */
  detail?: React.ReactNode;
  /** `sm` (20px) beside 12px text, `md` (24px) in a section header. */
  size?: 'sm' | 'md';
  /** Two or three words. */
  children: React.ReactNode;
}) {
  const Icon = icon ?? CALLOUT_TONE_ICONS[tone];
  const chip = (
    <Badge
      data-slot="callout-chip"
      data-tone={tone}
      shape="rounded"
      size={size}
      className={cn(CALLOUT_TONE_CLASSES[tone], className)}
      {...props}
    >
      <Icon aria-hidden />
      {children}
    </Badge>
  );

  if (!detail) {
    return chip;
  }

  return (
    <TapTooltip
      content={detail}
      triggerClassName="inline-flex w-auto max-w-full shrink-0 rounded-md"
    >
      {chip}
    </TapTooltip>
  );
}
