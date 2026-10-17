import type * as React from 'react';

import { Badge } from '@/components/kit/status/Badge';
import {
  CALLOUT_TONE_CLASSES,
  CALLOUT_TONE_ICONS,
  type CalloutTone,
} from '@/lib/kit/feedback/callout';
import type { KitIcon } from '@/lib/kit/layout/icon';
import { cn } from '@/lib/utils';

/**
 * A short notice inside a panel, such as "Includes unverified" on a chart:
 * the callout's colours on a small outlined chip. Its words say it all, so
 * nothing opens from it. Use Callout when the notice needs a sentence.
 */
export function CalloutChip({
  tone = 'warning',
  icon,
  size = 'md',
  children,
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'color'> & {
  tone?: CalloutTone;
  /** Replaces the tone's glyph, such as a shield for unverified data. */
  icon?: KitIcon;
  /** `sm` (20px) beside 12px text, `md` (24px) in a section header. */
  size?: 'sm' | 'md';
  /** Two or three words. */
  children: React.ReactNode;
}) {
  const Icon = icon ?? CALLOUT_TONE_ICONS[tone];

  return (
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
}
