import {
  ChartNoAxesColumn,
  ChevronLeft,
  FoldHorizontal,
  UnfoldHorizontal,
} from 'lucide-react';
import type * as React from 'react';

import { ChartTooltipBody } from '@/components/kit/charts/ChartTooltip';
import { Button } from '@/components/kit/controls/Button';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import type {
  BoxPlotMarks,
  BoxPlotQuartiles,
  ScaleTick,
} from '@/lib/beatmaps/chart-axis';
import { formatCountOf } from '@/lib/kit/format/number';
import { cn } from '@/lib/utils';

export type { ScaleTick };

// The beatmap kit became the shared layout kit. These old names stay only for
// pages that still import them from here; beatmap code imports the kit.
export { Panel as SectionCard } from '@/components/kit/layout/Panel';
export { SectionHeader } from '@/components/kit/layout/SectionHeader';
export { Tile } from '@/components/kit/layout/Tile';
export { Eyebrow } from '@/components/kit/layout/Typography';

/** A beatmap chart with too little data to draw: the kit's compact empty state. */
export function NotEnoughData({
  description,
  className,
}: {
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <EmptyState
      size="compact"
      icon={ChartNoAxesColumn}
      title="Not enough data"
      description={description}
      className={className}
    />
  );
}

/** One box-and-whisker row; pass null `marks` for an empty track of the same height. */
export function BoxPlotTrack({
  color,
  marks,
  gridPercents,
  className,
}: {
  color: string;
  marks: BoxPlotMarks | null;
  /** Interior axis tick positions, drawn through the track. */
  gridPercents: number[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative h-7 min-w-0 flex-1 rounded bg-muted/40',
        className
      )}
      aria-hidden="true"
    >
      {/* Axis gridlines */}
      {gridPercents.map((percent) => (
        <span
          key={percent}
          className="absolute inset-y-0 w-px bg-border/70"
          style={{ left: `${percent}%` }}
        />
      ))}

      {marks === null ? null : (
        <>
          {/* Whisker: min → max */}
          <span
            className="absolute top-1/2 h-px -translate-y-1/2 bg-muted-foreground/50"
            style={{
              left: `calc(${marks.minPercent}% + 5px)`,
              width: `max(0px, calc(${Math.max(marks.maxPercent - marks.minPercent, 0)}% - 10px))`,
            }}
          />
          {/* Box: p25 → p75 */}
          <span
            className="absolute inset-y-1 rounded"
            style={{
              left: `${marks.p25Percent}%`,
              width: `${Math.max(marks.p75Percent - marks.p25Percent, 0)}%`,
              minWidth: 2,
              backgroundColor: color,
              opacity: 0.7,
            }}
          />
          {/* Median tick */}
          <span
            className="absolute inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${marks.medianPercent}%` }}
          />
          {/* Extremes: a hollow ring, or a chevron where the axis cuts off */}
          {marks.minClamped ? (
            <ChevronCap color={color} percent={marks.minPercent} />
          ) : (
            <RingCap color={color} percent={marks.minPercent} />
          )}
          <RingCap color={color} percent={marks.maxPercent} />
        </>
      )}
    </div>
  );
}

function ChevronCap({ color, percent }: { color: string; percent: number }) {
  return (
    <ChevronLeft
      className="absolute top-1/2 z-10 size-3.5 -translate-y-1/2"
      style={{ color, left: `calc(${percent}% + 1px)` }}
      aria-hidden
    />
  );
}

function RingCap({ color, percent }: { color: string; percent: number }) {
  return (
    <span
      className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-transparent"
      style={{ left: `${percent}%`, borderColor: color }}
    />
  );
}

/** The five-number readout behind every box plot row, in the kit's chart tooltip. */
export function BoxPlotTooltipContent({
  labelIcon,
  label,
  scoreCount,
  measureLabel,
  quartiles,
  format,
}: {
  labelIcon: React.ReactNode;
  label: string;
  scoreCount: number;
  /** Names the measure on the median line: `Median`, `Median accuracy`. */
  measureLabel: string;
  quartiles: BoxPlotQuartiles;
  format: (value: number) => string;
}) {
  return (
    <ChartTooltipBody
      className="min-w-44"
      title={
        <span className="flex items-center gap-1.5">
          {labelIcon}
          {label}
        </span>
      }
      rows={[
        {
          key: 'median',
          label: measureLabel,
          value: format(quartiles.median),
        },
        {
          key: 'middle',
          label: 'Middle 50%',
          value: `${format(quartiles.p25)} – ${format(quartiles.p75)}`,
        },
        {
          key: 'range',
          label: 'Range',
          value: `${format(quartiles.min)} – ${format(quartiles.max)}`,
        },
      ]}
      footer={formatCountOf(scoreCount, 'score')}
    />
  );
}

/** A ticked axis under a row chart; the left spacer matches the rows' label column. */
export function ScaleAxis({
  leftSpacerClassName,
  ticks,
  className,
}: {
  leftSpacerClassName: string;
  ticks: ScaleTick[];
  className?: string;
}) {
  return (
    <div className={cn('mt-1 flex items-start gap-2', className)}>
      <span
        className={cn(leftSpacerClassName, 'shrink-0')}
        aria-hidden="true"
      />
      <div className="relative h-5 min-w-0 flex-1 tabular-nums">
        {ticks.map((tick) => (
          <div key={tick.value}>
            <span
              className="absolute top-0 h-1.5 w-px -translate-x-1/2 bg-border"
              style={{ left: `${tick.percent}%` }}
              aria-hidden="true"
            />
            <span
              className={cn(
                'absolute top-2.5 text-xs whitespace-nowrap text-muted-foreground',
                // Aligned by position: a clipped axis can end on an interior tick.
                tick.percent <= 0 && 'translate-x-0',
                tick.percent >= 100 && '-translate-x-full',
                tick.percent > 0 && tick.percent < 100 && '-translate-x-1/2'
              )}
              style={{ left: `${tick.percent}%` }}
            >
              {tick.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Switches one box plot chart between its truncated default and the full range. */
export function FullRangeToggle({
  pressed,
  onPressedChange,
  label,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  /** Accessible name; must contain the visible "Full range" (WCAG 2.5.3). */
  label: string;
}) {
  return (
    // -my-1 keeps the 32px button inside the 24px label row beside it.
    <Button
      variant="ghost"
      size="sm"
      icon={pressed ? FoldHorizontal : UnfoldHorizontal}
      aria-pressed={pressed}
      aria-label={label}
      onClick={() => onPressedChange(!pressed)}
      className="-my-1 shrink-0 text-xs text-muted-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground"
    >
      Full range
    </Button>
  );
}
