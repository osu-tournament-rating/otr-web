import {
  ChevronLeft,
  FoldHorizontal,
  Info,
  UnfoldHorizontal,
} from 'lucide-react';
import type * as React from 'react';

import TapTooltip from '@/components/tap-tooltip';
import { Toggle } from '@/components/ui/toggle';
import type {
  BoxPlotMarks,
  BoxPlotQuartiles,
  ScaleTick,
} from '@/lib/beatmaps/chart-axis';
import { cn } from '@/lib/utils';
import { formatChartNumber } from '@/lib/utils/chart';

export type { ScaleTick };

/**
 * Card chrome shared by the beatmap detail page's sections. `as` exists for the
 * page header, which needs the same surface on a `<header>` element.
 */
export function SectionCard({
  as: Tag = 'section',
  className,
  ...props
}: React.ComponentProps<'section'> & { as?: 'section' | 'header' }) {
  return (
    <Tag
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none',
        className
      )}
      {...props}
    />
  );
}

/** The shared tile chrome behind the page's stat grids. */
export function Tile({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg border bg-muted/25 px-3 py-2.5', className)}
      {...props}
    />
  );
}

/** The color chip that fronts every mod, grade, and rank-bracket label. */
export function Swatch({ color }: { color: string }) {
  return (
    <span
      className="size-2 shrink-0 rounded-[2px]"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  infoText,
  meta,
  className,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  /**
   * Static, per-card explanation of how to read the chart. Never per-beatmap
   * text — that belongs in meta.
   *
   * A string rather than a node: this module is imported by server components,
   * and a string forbids arbitrary markup drifting into a header.
   */
  infoText?: string;
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
        {infoText ? (
          // TapTooltip, not SimpleTooltip: a bare <svg> trigger is not
          // focusable and never opens on touch.
          <TapTooltip
            side="bottom"
            align="start"
            triggerAriaLabel={`About ${title}`}
            triggerClassName="flex w-auto shrink-0 items-center rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            content={<span className="block max-w-56">{infoText}</span>}
          >
            <Info className="size-4" aria-hidden />
          </TapTooltip>
        ) : null}
      </div>
      {meta ? (
        <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
      ) : null}
    </div>
  );
}

export function EmptyState({
  children = 'Not enough data',
}: {
  children?: React.ReactNode;
}) {
  return (
    <p className="px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * One box-and-whisker row: whisker from min to max, a filled box over the
 * middle 50%, a median tick, and hollow rings on the extremes. The axis is
 * anchored on the highest maximum, so only the low end can be cut off; that
 * whisker ends in a chevron instead of a ring. Pass `marks` as null for a row
 * with no data — the empty track keeps the row's height so the columns either
 * side of it stay aligned.
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
      // Nudged inward so the glyph sits fully on the track rather than
      // straddling the edge the way a ring does.
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

/** Hollow ring glyph echoing the box plot's min/max marks. */
function RingGlyph({ color }: { color: string }) {
  return (
    <span
      className="size-1.5 shrink-0 rounded-full border bg-transparent"
      style={{ borderColor: color }}
      aria-hidden="true"
    />
  );
}

/**
 * The readout behind every box plot row: the same five numbers, formatted for
 * whichever measure the row is drawn from.
 */
export function BoxPlotTooltipContent({
  labelIcon,
  label,
  scoreCount,
  measureLabel,
  quartiles,
  color,
  format,
}: {
  labelIcon: React.ReactNode;
  label: string;
  scoreCount: number;
  /** Names the measure on the median line: `Median`, `Median accuracy`. */
  measureLabel: string;
  quartiles: BoxPlotQuartiles;
  color: string;
  format: (value: number) => string;
}) {
  return (
    <div className="min-w-44 space-y-1">
      <div className="flex items-center justify-between gap-4 border-b pb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          {labelIcon}
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {`${formatChartNumber(scoreCount)} scores`}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-muted-foreground">{measureLabel}</span>
        <span className="text-sm font-semibold">
          {format(quartiles.median)}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-muted-foreground">Middle 50%</span>
        <span className="text-xs">
          {`${format(quartiles.p25)} – ${format(quartiles.p75)}`}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-muted-foreground">Range</span>
        <span className="flex items-center gap-1.5 text-xs">
          <RingGlyph color={color} />
          {`${format(quartiles.min)} – ${format(quartiles.max)}`}
          <RingGlyph color={color} />
        </span>
      </div>
    </div>
  );
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
  return (
    <div className={cn('mt-1 flex items-start gap-2', className)}>
      <span
        className={cn(leftSpacerClassName, 'shrink-0')}
        aria-hidden="true"
      />
      <div className="relative h-5 min-w-0 flex-1">
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
                // Aligned by position, not by index: an axis clipped to its
                // data maximum ends on an interior tick, which still wants a
                // centred label.
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

/**
 * Switches one box plot chart between its truncated default and the full range
 * of every whisker. Render it only when the truncated axis actually cuts
 * something off.
 */
export function FullRangeToggle({
  pressed,
  onPressedChange,
  label,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  /**
   * Accessible name. Must contain the visible "Full range" (WCAG 2.5.3), and
   * disambiguates the two toggles the tier card renders.
   */
  label: string;
}) {
  return (
    // h-6 keeps the 24px target of WCAG 2.5.8; the icon swap is the
    // non-colour pressed cue over Toggle's own data-[state=on] background.
    <Toggle
      size="sm"
      pressed={pressed}
      onPressedChange={onPressedChange}
      aria-label={label}
      className="h-6 shrink-0 cursor-pointer gap-1 px-1.5 text-xs font-medium text-muted-foreground data-[state=on]:text-accent-foreground"
    >
      {pressed ? (
        <FoldHorizontal className="size-3.5" aria-hidden />
      ) : (
        <UnfoldHorizontal className="size-3.5" aria-hidden />
      )}
      Full range
    </Toggle>
  );
}

/** Icon + label over a large value, the body of every Tournament activity tile. */
export function TileStat({
  icon: Icon,
  label,
  sublabel,
  value,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  sublabel?: string;
  value: string;
}) {
  // <span> rather than <dt>/<dd>: the "Pooled in" tile is a <button>, and HTML
  // forbids description-list elements inside one.
  return (
    <>
      <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-1 block text-xl leading-none font-bold">
        {value}
        {sublabel ? (
          <span className="mt-0.5 block text-xs leading-tight font-normal text-muted-foreground">
            {sublabel}
          </span>
        ) : null}
      </span>
    </>
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
