import type * as React from 'react';

/** Any lucide icon, or a custom SVG component with the same two props. */
export type KitIcon = React.ComponentType<{
  className?: string;
  'aria-hidden'?: boolean;
}>;
