import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * The root element of every page, loading screen and error screen. It spans
 * the content column and keeps panels 16px apart at every width. The side
 * margin (16px on phones) and the 40px top offset on desktop come from the
 * root layout's `main`, so pages never add their own padding or `container`.
 */
export function PageFrame({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-frame"
      className={cn('flex w-full min-w-0 flex-col gap-4', className)}
      {...props}
    />
  );
}
