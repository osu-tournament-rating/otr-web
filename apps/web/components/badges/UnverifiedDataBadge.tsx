'use client';

import { ShieldQuestion } from 'lucide-react';

import TapTooltip from '@/components/tap-tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const LABEL = 'Includes unverified';
const TOOLTIP =
  'Includes tournaments that have not been verified, so some entries may later change or be removed.';

/**
 * Marks a chart whose data is not filtered to verified entities. Only for
 * charts that stand alone *and* where verified and unverified entries cannot be
 * told apart by looking; anything running through a verified-only query does
 * not need it.
 */
export default function UnverifiedDataBadge({
  className,
}: {
  className?: string;
}) {
  return (
    <TapTooltip
      content={TOOLTIP}
      triggerAriaLabel={LABEL}
      triggerClassName="flex w-auto shrink-0 items-center"
    >
      <Badge
        variant="outline"
        className={cn(
          // `warning` itself is yellow-400: 1.4:1 on this tint over a light
          // card. Light mode takes the yellow-900 foreground token instead.
          'gap-1 border-current/20 bg-warning/15 text-warning-foreground dark:text-warning',
          className
        )}
      >
        <ShieldQuestion aria-hidden />
        {LABEL}
      </Badge>
    </TapTooltip>
  );
}
