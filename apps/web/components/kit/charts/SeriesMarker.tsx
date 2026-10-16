import type * as React from 'react';

import { cn } from '@/lib/utils';

export type SeriesMarkerShape = 'square' | 'dot' | 'line' | 'dashed';

function shapeStyle(
  shape: SeriesMarkerShape,
  color: string
): React.CSSProperties {
  if (shape === 'dashed') {
    return {
      backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 6px)`,
    };
  }
  return { backgroundColor: color };
}

/**
 * The colour key in front of a series name in a legend or chart tooltip.
 * Match the mark: `square` for bars and areas, `line` for lines, `dashed`
 * for reference and trend lines, `dot` for points.
 */
export function SeriesMarker({
  color,
  shape = 'square',
  className,
  style,
  ...props
}: React.ComponentProps<'span'> & {
  /** Any CSS colour, usually a palette `var(--…)`. */
  color: string;
  shape?: SeriesMarkerShape;
}) {
  return (
    <span
      aria-hidden="true"
      data-marker={shape}
      className={cn(
        'inline-block shrink-0',
        shape === 'line' && 'h-0.5 w-3 rounded-full',
        shape === 'dashed' && 'h-0.5 w-3.5',
        shape === 'dot' && 'size-2 rounded-full',
        shape === 'square' && 'size-2 rounded-xs',
        className
      )}
      style={{ ...shapeStyle(shape, color), ...style }}
      {...props}
    />
  );
}
