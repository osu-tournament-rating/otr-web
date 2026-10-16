import type * as React from 'react';

import TapTooltip from '@/components/tap-tooltip';
import { cn } from '@/lib/utils';

/**
 * A short form, such as CS for circle size, whose full form opens on tap,
 * hover and keyboard focus, and is what screen readers hear. It replaces
 * `<abbr title>`, whose title only shows on a mouse hover. Use it in labels
 * where the short form is the established name: stat tiles, table headers,
 * filter labels.
 */
export function Abbreviation({
  full,
  side = 'top',
  className,
  children,
}: {
  /** The full form, in sentence case: "Circle size". */
  full: string;
  /** The short form shown: "CS". */
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}) {
  return (
    <TapTooltip
      side={side}
      align="start"
      content={full}
      triggerAriaLabel={full}
      triggerClassName={cn(
        // Sits in the line like text; the dotted underline is the cue.
        'inline w-auto underline decoration-muted-foreground/60 decoration-dotted underline-offset-2',
        className
      )}
    >
      {children}
    </TapTooltip>
  );
}
