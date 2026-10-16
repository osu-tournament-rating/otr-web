import { Filter } from 'lucide-react';

import { Button, type ButtonProps } from '@/components/kit/controls/Button';
import { Badge } from '@/components/kit/status/Badge';
import { formatBadgeCount } from '@/lib/kit/status/count';
import { cn } from '@/lib/utils';

/**
 * The labelled "Filters" button that opens a list's filter panel, with the
 * number of active filters beside the label. `FilterPanel` renders it; use
 * it alone only to open filters some other way.
 */
export function FilterButton({
  count,
  label = 'Filters',
  className,
  ...props
}: Omit<
  ButtonProps,
  'children' | 'variant' | 'size' | 'icon' | 'pending' | 'asChild'
> & {
  /** Active filters behind the button (`activeFilterCount`). */
  count: number;
  label?: string;
}) {
  return (
    <Button
      variant="outline"
      // The toolbar's height, beside the 40px search field and sort.
      size="lg"
      icon={Filter}
      aria-label={count > 0 ? `${label}, ${count} active` : label}
      className={cn(
        'bg-background dark:bg-input/50 dark:shadow-none',
        className
      )}
      {...props}
    >
      <span>{label}</span>
      {count > 0 ? (
        <Badge variant="solid" tone="primary" size="sm" aria-hidden="true">
          {formatBadgeCount(count)}
        </Badge>
      ) : null}
    </Button>
  );
}
