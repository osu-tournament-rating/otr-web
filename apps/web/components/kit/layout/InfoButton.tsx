import { Info } from 'lucide-react';
import type * as React from 'react';

import TapTooltip from '@/components/tap-tooltip';
import { cn } from '@/lib/utils';

/**
 * The one help affordance: a muted circled "i" beside the thing it explains.
 * It opens on hover, keyboard focus and tap, so it works on phones. Use it
 * for every inline explanation; never a "?" glyph or a hover-only tooltip.
 */
export function InfoButton({
  label,
  children,
  side = 'bottom',
  align = 'center',
  size = 'md',
  className,
}: {
  /** Accessible name, such as "About tier breakdown". */
  label: string;
  /** The explanation: a sentence or two of plain text. */
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** `sm` sits beside 12px labels, `md` beside 14px and 16px text. */
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <TapTooltip
      side={side}
      align={align}
      triggerAriaLabel={label}
      triggerClassName={cn(
        'relative flex w-auto shrink-0 items-center rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground',
        // Widens the hit area to at least 24px without moving the glyph.
        'after:absolute after:-inset-1 after:rounded-full',
        className
      )}
      content={<span className="block max-w-56">{children}</span>}
    >
      <Info className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
    </TapTooltip>
  );
}
