'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type * as React from 'react';

import {
  FilterField,
  type FilterFieldProps,
} from '@/components/kit/lists/FilterPanel';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  SLIDER_MAX,
  SLIDER_MIN,
  SLIDER_STEP,
  linearScale,
  type NumericScale,
} from '@/lib/filters/scale';
import { formatFilterNumber } from '@/lib/kit/lists/filters';
import { normalizeRange, type NumberRange } from '@/lib/kit/lists/params';
import { cn } from '@/lib/utils';

type Bound = 'min' | 'max';

/** A bound being typed or dragged: `text` is shown, `value` is tracked. */
interface DraftBound {
  text: string;
  value?: number;
}

type Draft = Partial<Record<Bound, DraftBound>>;

function dropBound(draft: Draft, bound: Bound): Draft {
  const next = { ...draft };
  delete next[bound];
  return next;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Accepts `1,000` and `1000`; anything else is not a number. */
function parseBox(text: string): number | undefined {
  const cleaned = text.replace(/,/g, '').trim();
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * A numeric range: the label with two number boxes beside it, and a
 * two-thumb slider underneath. Boxes commit on Enter or blur, the slider on
 * release, so each change navigates once. A bound at the end of the track
 * means "no limit". The boxes always sit beside the label, and long labels
 * wrap instead of truncating.
 */
export function RangeFilter({
  min,
  max,
  step,
  scale: scaleProp,
  value,
  onValueChange,
  format = formatFilterNumber,
  valueLabel,
  label,
  ...field
}: FilterFieldProps & {
  /** The domain. The same bounds as the page's `rangeParam`. */
  min: number;
  max: number;
  /** Linear step; ignored when `scale` is given. */
  step?: number;
  /** A non-linear track, such as `tieredScale` or the rank scale, from `@/lib/filters`. */
  scale?: NumericScale;
  value: NumberRange;
  onValueChange: (value: NumberRange) => void;
  /** How screen readers hear a value, such as a duration. The boxes always show the plain number. */
  format?: (value: number) => string;
  /** The noun in the boxes' and thumbs' names ("Minimum rank"). Defaults to the label. */
  valueLabel?: string;
}) {
  const [draft, setDraft] = useState<Draft>({});
  const activeThumb = useRef<0 | 1>(0);

  const scale = useMemo(
    () => scaleProp ?? linearScale({ min, max, step }),
    [scaleProp, min, max, step]
  );

  // A navigation landed, so any edit in flight is stale.
  useEffect(() => {
    setDraft({});
  }, [value.min, value.max]);

  const read = (bound: Bound) => {
    const entry = draft[bound];
    return entry === undefined ? value[bound] : entry.value;
  };
  const minValue = read('min');
  const maxValue = read('max');

  const noun = valueLabel ?? label;

  const clampToBound = (bound: Bound, next: number) =>
    bound === 'min'
      ? clamp(next, min, maxValue ?? max)
      : clamp(next, minValue ?? min, max);

  const commit = (bound: Bound, next: number | undefined) => {
    setDraft((current) => dropBound(current, bound));
    const range = {
      ...value,
      [bound]: next === undefined ? undefined : clampToBound(bound, next),
    };
    onValueChange(normalizeRange(range, { min, max }));
  };

  const commitText = (bound: Bound) => {
    const entry = draft[bound];
    if (entry === undefined) return;
    if (entry.text.trim() === '') {
      commit(bound, undefined);
      return;
    }
    const parsed = parseBox(entry.text);
    if (parsed === undefined) {
      // Unreadable text goes back to the last value, never to zero.
      setDraft((current) => dropBound(current, bound));
      return;
    }
    commit(bound, scale.snap(parsed));
  };

  // An open bound pins its thumb to that end of the track.
  const positions: [number, number] = [
    minValue === undefined ? SLIDER_MIN : scale.toPosition(minValue),
    maxValue === undefined ? SLIDER_MAX : scale.toPosition(maxValue),
  ];

  const widest = Math.max(
    formatFilterNumber(min).length,
    formatFilterNumber(max).length
  );
  const boxWidth = widest > 6 ? 'w-24' : widest > 4 ? 'w-[4.5rem]' : 'w-14';

  const box = (bound: Bound) => {
    const isMin = bound === 'min';
    const entry = draft[bound];
    const committed = value[bound];
    return (
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={`${isMin ? 'Minimum' : 'Maximum'} ${noun}`}
        placeholder="Any"
        data-filter-draft={entry ? 'true' : undefined}
        value={
          entry?.text ??
          (committed === undefined ? '' : formatFilterNumber(committed))
        }
        onChange={(event) => {
          const text = event.target.value;
          setDraft((current) => ({
            ...current,
            [bound]: {
              text,
              value:
                text.trim() === ''
                  ? undefined
                  : (parseBox(text) ?? current[bound]?.value ?? committed),
            },
          }));
        }}
        onBlur={() => commitText(bound)}
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitText(bound);
          } else if (event.key === 'Escape' && entry) {
            setDraft((current) => dropBound(current, bound));
          }
        }}
        className={cn(
          'h-8 px-2 text-center tabular-nums placeholder:text-muted-foreground',
          boxWidth
        )}
      />
    );
  };

  return (
    <FilterField
      label={label}
      {...field}
      aside={
        <div className="flex shrink-0 items-center gap-1">
          {box('min')}
          <span aria-hidden="true" className="text-sm text-muted-foreground">
            –
          </span>
          {box('max')}
        </div>
      }
    >
      <Slider
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={SLIDER_STEP}
        minStepsBetweenThumbs={0}
        value={positions}
        // The default track is the popover colour in light mode.
        className="py-1.5 [&_[data-slot=slider-track]]:bg-muted-foreground/25"
        onValueChange={(next) => {
          const minMoved = Math.abs(next[0] - positions[0]);
          const maxMoved = Math.abs(next[1] - positions[1]);
          const moved =
            minMoved === maxMoved
              ? activeThumb.current
              : minMoved > maxMoved
                ? 0
                : 1;
          activeThumb.current = moved;
          const bound: Bound = moved === 0 ? 'min' : 'max';
          const dragged = clampToBound(bound, scale.fromPosition(next[moved]));
          // Held as a draft until release: one navigation per drag.
          setDraft((current) => ({
            ...current,
            [bound]: { text: formatFilterNumber(dragged), value: dragged },
          }));
        }}
        onValueCommit={(next) => {
          const moved = activeThumb.current;
          commit(moved === 0 ? 'min' : 'max', scale.fromPosition(next[moved]));
        }}
        getThumbProps={(index) => {
          const isMin = index === 0;
          const bound: Bound = isMin ? 'min' : 'max';
          const current = (isMin ? minValue : maxValue) ?? (isMin ? min : max);
          return {
            'aria-label': `${isMin ? 'Minimum' : 'Maximum'} ${noun}`,
            'aria-valuemin': isMin ? min : (minValue ?? min),
            'aria-valuemax': isMin ? (maxValue ?? max) : max,
            'aria-valuenow': current,
            'aria-valuetext':
              (isMin ? minValue : maxValue) === undefined
                ? 'Any'
                : format(current),
            onFocus: () => {
              activeThumb.current = isMin ? 0 : 1;
            },
            onPointerDown: () => {
              activeThumb.current = isMin ? 0 : 1;
            },
            // Keys step through the scale's own stops and apply at once.
            onKeyDown: (event) => {
              const stops = event.shiftKey ? 10 : 1;
              let next: number | undefined;
              if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                next = scale.step(current, stops);
              } else if (
                event.key === 'ArrowLeft' ||
                event.key === 'ArrowDown'
              ) {
                next = scale.step(current, -stops);
              } else if (event.key === 'PageUp') {
                next = scale.step(current, 10);
              } else if (event.key === 'PageDown') {
                next = scale.step(current, -10);
              } else if (event.key === 'Home') {
                next = isMin ? min : (minValue ?? min);
              } else if (event.key === 'End') {
                next = isMin ? (maxValue ?? max) : max;
              }
              if (next === undefined) return;
              event.preventDefault();
              commit(bound, next);
            },
          };
        }}
      />
    </FilterField>
  );
}
