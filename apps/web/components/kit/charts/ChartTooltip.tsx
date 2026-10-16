import type * as React from 'react';

import { formatNumberTick } from '@/lib/kit/charts/format';
import { cn } from '@/lib/utils';

import { SeriesMarker, type SeriesMarkerShape } from './SeriesMarker';

export interface ChartTooltipRow {
  key: string;
  label: React.ReactNode;
  /** Already formatted, such as `formatCountTick(value)`. */
  value: React.ReactNode;
  /** Draws a marker in the series colour before the label. */
  color?: string;
  marker?: SeriesMarkerShape;
}

/**
 * The readout inside every chart tooltip: an optional title, one row per
 * series (marker, muted name, value on the right) and an optional footer.
 * Values and the footer take tabular figures, since they change in place.
 * Use it bare inside a `TapTooltip`; Recharts charts use `ChartTooltipContent`.
 */
export function ChartTooltipBody({
  title,
  rows,
  footer,
  className,
}: {
  title?: React.ReactNode;
  rows: readonly ChartTooltipRow[];
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid min-w-32 gap-1.5 text-xs', className)}>
      {title ? <div className="font-medium">{title}</div> : null}
      {rows.length > 0 ? (
        <div className="grid gap-1">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              {row.color ? (
                <SeriesMarker color={row.color} shape={row.marker} />
              ) : null}
              <span className="text-foreground/70">{row.label}</span>
              <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {footer ? (
        // A total or share that changes as the pointer moves: tabular, like the values.
        <div className="border-t border-foreground/15 pt-1.5 text-foreground/70 tabular-nums">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** The framed tooltip card Recharts draws next to the cursor. */
export function ChartTooltipCard({
  className,
  ...props
}: React.ComponentProps<typeof ChartTooltipBody>) {
  return (
    <ChartTooltipBody
      className={cn(
        'rounded-lg border border-border/50 bg-background px-2.5 py-1.5 shadow-xl',
        className
      )}
      {...props}
    />
  );
}

/** One series in Recharts' tooltip payload, loosely typed to fit every chart. */
export interface ChartTooltipPayloadItem {
  name?: string | number;
  dataKey?: unknown;
  value?: unknown;
  color?: string;
  fill?: string;
  stroke?: string;
  payload?: unknown;
}

/**
 * The one chart tooltip's content. Pass it to the `ChartTooltip` from
 * `@/components/ui/chart` (Recharts' `Tooltip`), as the beatmap charts do:
 * `<ChartTooltip content={<ChartTooltipContent valueFormatter={formatCountTick} />} />`.
 * Recharts fills in `active`, `payload` and `label`. It replaces the shadcn
 * `ChartTooltipContent` from `@/components/ui/chart`, which has no
 * `valueFormatter`, footer or kit marker.
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = formatNumberTick,
  nameFormatter,
  marker = 'square',
  reverse = false,
  footer,
  className,
}: {
  active?: boolean;
  payload?: readonly ChartTooltipPayloadItem[];
  label?: string | number;
  /** Formats the hovered x value for the title; return null to hide it. */
  labelFormatter?: (
    label: string | number,
    payload: readonly ChartTooltipPayloadItem[]
  ) => React.ReactNode;
  /** Formats each value; `formatNumberTick` (`1,250`) by default. */
  valueFormatter?: (
    value: number,
    item: ChartTooltipPayloadItem
  ) => React.ReactNode;
  /** Maps a series name or data key to its display name. */
  nameFormatter?: (name: string) => React.ReactNode;
  marker?: SeriesMarkerShape;
  /** List series top to bottom, to match a vertical stack. */
  reverse?: boolean;
  footer?: (payload: readonly ChartTooltipPayloadItem[]) => React.ReactNode;
  className?: string;
}) {
  if (!active || !payload?.length) return null;

  const items = reverse ? [...payload].reverse() : payload;
  const rows: ChartTooltipRow[] = items
    .filter((item) => typeof item.value === 'number')
    .map((item, index) => {
      const name = String(item.name ?? item.dataKey ?? index);
      const cellFill = (item.payload as { fill?: unknown } | undefined)?.fill;

      return {
        key: `${name}-${index}`,
        label: nameFormatter ? nameFormatter(name) : name,
        value: valueFormatter(item.value as number, item),
        color:
          item.color ??
          (typeof cellFill === 'string' ? cellFill : undefined) ??
          item.fill ??
          item.stroke,
        marker,
      };
    });

  const title =
    label === undefined
      ? null
      : labelFormatter
        ? labelFormatter(label, payload)
        : label;

  return (
    <ChartTooltipCard
      title={title}
      rows={rows}
      footer={footer?.(payload)}
      className={className}
    />
  );
}
