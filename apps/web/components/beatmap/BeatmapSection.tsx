import { ChevronLeft, ChevronRight } from 'lucide-react';
import type * as React from 'react';

import type { BoxPlotMarks } from '@/lib/beatmaps/chart-axis';
import { cn } from '@/lib/utils';

/** Card chrome shared by the beatmap detail page's sections. */
export function SectionCard({
  className,
  ...props
}: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none',
        className
      )}
      {...props}
    />
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  meta,
  className,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <h2 className="truncate font-semibold">{title}</h2>
      </div>
      {meta ? (
        <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * The 0..max axis under a row chart. The spacers match the label and value
 * columns of the rows above so the two end labels sit exactly under the track.
 */
export function ScaleFooter({
  leftSpacerClassName,
  rightSpacerClassName,
  minLabel,
  maxLabel,
}: {
  leftSpacerClassName: string;
  rightSpacerClassName: string;
  minLabel: React.ReactNode;
  maxLabel: React.ReactNode;
}) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <span
        className={cn(leftSpacerClassName, 'shrink-0')}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-1 justify-between text-xs text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </span>
      <span
        className={cn(rightSpacerClassName, 'shrink-0')}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * One box-and-whisker row: whisker from min to max, a filled box over the
 * middle 50%, a median tick, and hollow rings on the extremes. A whisker the
 * axis cuts off ends in a chevron instead of a ring. Pass `marks` as null for a
 * row with no data — the empty track keeps the row's height so the columns
 * either side of it stay aligned.
 */
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
      {/* Axis gridlines, so a box can be read against the ticks below */}
      {gridPercents.map((percent) => (
        <span
          key={percent}
          className="absolute inset-y-0 w-px bg-border/70"
          style={{ left: `${percent}%` }}
        />
      ))}

      {marks === null ? null : (
        <>
          {/* Whisker: min → max, inset so it stops short of the hollow rings */}
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
            className="absolute inset-y-0.5 w-[2px] -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${marks.medianPercent}%` }}
          />
          {/* Extremes: a hollow ring, or a chevron where the axis cuts off */}
          <WhiskerCap
            color={color}
            percent={marks.minPercent}
            clamped={marks.minClamped}
            direction="left"
          />
          <WhiskerCap
            color={color}
            percent={marks.maxPercent}
            clamped={marks.maxClamped}
            direction="right"
          />
        </>
      )}
    </div>
  );
}

function WhiskerCap({
  color,
  percent,
  clamped,
  direction,
}: {
  color: string;
  percent: number;
  clamped: boolean;
  direction: 'left' | 'right';
}) {
  const Chevron = direction === 'left' ? ChevronLeft : ChevronRight;

  return clamped ? (
    <Chevron
      className="absolute top-1/2 z-10 size-3.5 -translate-y-1/2"
      style={{
        color,
        // Nudged inward so the glyph sits fully on the track rather than
        // straddling the edge the way a ring does.
        left: `calc(${percent}% ${direction === 'left' ? '+ 1px' : '- 15px'})`,
      }}
      aria-hidden
    />
  ) : (
    <span
      className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-transparent"
      style={{ left: `${percent}%`, borderColor: color }}
    />
  );
}

export interface ScaleTick {
  /** Stable key and sort position. */
  value: number;
  label: string;
  /** Position along the track, 0..100. */
  percent: number;
}

/**
 * A ticked axis under a row chart. The left spacer matches the label column of
 * the rows above so the ticks land on the same scale the boxes are drawn from.
 * End labels are pulled inward instead of centered so they cannot spill past
 * the card.
 */
export function ScaleAxis({
  leftSpacerClassName,
  ticks,
  className,
}: {
  leftSpacerClassName: string;
  ticks: ScaleTick[];
  className?: string;
}) {
  const lastIndex = ticks.length - 1;

  return (
    <div className={cn('mt-1 flex items-start gap-2', className)}>
      <span
        className={cn(leftSpacerClassName, 'shrink-0')}
        aria-hidden="true"
      />
      <div className="relative h-5 min-w-0 flex-1">
        {ticks.map((tick, index) => (
          <div key={tick.value}>
            <span
              className="absolute top-0 h-1.5 w-px -translate-x-1/2 bg-border"
              style={{ left: `${tick.percent}%` }}
              aria-hidden="true"
            />
            <span
              className={cn(
                'absolute top-2.5 text-xs whitespace-nowrap text-muted-foreground',
                lastIndex === 0 && '-translate-x-1/2',
                lastIndex > 0 && index === 0 && 'translate-x-0',
                lastIndex > 0 && index === lastIndex && '-translate-x-full',
                lastIndex > 0 &&
                  index > 0 &&
                  index < lastIndex &&
                  '-translate-x-1/2'
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

/** Small muted caption used for column and group labels. */
export function Eyebrow({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  );
}
