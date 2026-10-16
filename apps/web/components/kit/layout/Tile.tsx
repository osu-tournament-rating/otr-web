import { Slot } from '@radix-ui/react-slot';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * The small bordered box inside a panel, for one stat, attribute or record.
 * Tiles sit in a grid inside a panel, never on the page by themselves.
 */
export function Tile({
  asChild = false,
  interactive = false,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  /** Render the tile chrome on the child, such as a `DialogTrigger` button. */
  asChild?: boolean;
  /** Adds the hover tint and focus ring for a tile that opens something. */
  interactive?: boolean;
}) {
  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      data-slot="tile"
      className={cn(
        'rounded-lg border bg-muted/25 px-3 py-2.5',
        // flex-col keeps a button's content at the top when the grid
        // stretches it beside a taller tile; a bare button centres it.
        interactive &&
          'flex cursor-pointer flex-col text-left transition-colors hover:border-ring/40 hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        className
      )}
      {...props}
    />
  );
}
