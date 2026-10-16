import type * as React from 'react';

import { cn } from '@/lib/utils';

import { SeriesMarker, type SeriesMarkerShape } from './SeriesMarker';

export interface ChartLegendItem {
  key: string;
  label: React.ReactNode;
  color: string;
  marker?: SeriesMarkerShape;
}

/**
 * The key for a chart with two or more series: a marker in the series colour
 * and a muted 12px name. Put it above the plot, in the same order as the
 * series. A single series needs no legend; the section title names it.
 */
export function ChartLegend({
  items,
  marker = 'square',
  className,
  ...props
}: React.ComponentProps<'ul'> & {
  items: readonly ChartLegendItem[];
  /** Default marker for items that do not set their own. */
  marker?: SeriesMarkerShape;
}) {
  return (
    <ul
      aria-label="Legend"
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground',
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <SeriesMarker color={item.color} shape={item.marker ?? marker} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
