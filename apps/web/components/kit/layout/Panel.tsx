import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * The one surface every section sits on. A panel holds a SectionHeader and
 * then rows, tiles, a table or a chart, never another panel or card.
 */
export function Panel({
  as: Tag = 'section',
  className,
  ...props
}: Omit<React.ComponentProps<'section'>, 'ref'> & {
  as?: 'section' | 'header' | 'div' | 'article';
}) {
  return (
    <Tag
      data-slot="panel"
      className={cn(
        'overflow-clip rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none',
        className
      )}
      {...props}
    />
  );
}

/** A panel's content area with the standard 16px padding. */
export function PanelBody({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div data-slot="panel-body" className={cn('p-4', className)} {...props} />
  );
}
