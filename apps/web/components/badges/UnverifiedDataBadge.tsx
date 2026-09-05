'use client';

import { ShieldQuestion } from 'lucide-react';

import SimpleTooltip from '@/components/simple-tooltip';
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
    <SimpleTooltip
      side="bottom"
      content={TOOLTIP}
      triggerAriaLabel={LABEL}
      triggerClassName="shrink-0"
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
    </SimpleTooltip>
  );
}
