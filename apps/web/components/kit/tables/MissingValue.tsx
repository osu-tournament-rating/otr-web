import type * as React from 'react';

import { EMPTY_VALUE } from '@/lib/kit/format/empty';
import { cn } from '@/lib/utils';

/**
 * A muted em dash for a value that is missing, read as "No value". Table
 * cells and phone rows render it for you; use it directly in tiles and
 * other places that show one value.
 */
export function MissingValue({
  label = 'No value',
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'children'> & {
  /** What a screen reader says instead of the dash. */
  label?: string;
}) {
  return (
    <span
      data-slot="missing-value"
      className={cn('text-muted-foreground', className)}
      {...props}
    >
      <span aria-hidden="true">{EMPTY_VALUE}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
