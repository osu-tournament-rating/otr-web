'use client';

import { ShieldQuestion } from 'lucide-react';

import TapTooltip from '@/components/tap-tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const LABEL = 'Includes unverified';
const TOOLTIP = 'Includes data that has not been verified';

/** Marks a standalone chart whose data is not filtered to verified entities. */
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
