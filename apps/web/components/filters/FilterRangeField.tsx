'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  SLIDER_MAX,
  SLIDER_MIN,
  SLIDER_STEP,
  linearScale,
  type NumericScale,
} from '@/lib/filters/scale';
import { cn } from '@/lib/utils';

export interface FilterFieldBase {
  id: string;
  label: string;
  description?: string;
  className?: string;
  span?: 'full' | 'half';
}

export interface FilterRangeValue {
  min?: number;
  max?: number;
}

export interface FilterRangeFieldDescriptor extends FilterFieldBase {
  kind: 'range';
  min: number;
  max: number;
  step?: number;
  /** Defaults to a linear scale over [min, max]. */
  scale?: NumericScale;
  /** Set false for boxes without a track (tight, rarely-dragged fields). */
  slider?: boolean;
  /** Noun used in the thumb and box accessible names. Defaults to `label`. */
  valueLabel?: string;
  /** Screen-reader value text only; the boxes always show the plain number. */
  format?: (value: number) => string;
  value: FilterRangeValue;
  onChange: (next: FilterRangeValue) => void;
}

type Bound = 'min' | 'max';

/**
 * A bound being typed or dragged. `text` is what the box shows so intermediate
 * input ("7.", "-") survives, `value` is what the slider tracks.
 */
interface DraftBound {
  text: string;
  value?: number;
}

type Draft = Partial<Record<Bound, DraftBound>>;

/** Clears one bound's in-flight edit, leaving the other bound's alone. */
function dropBound(draft: Draft, bound: Bound): Draft {
  const next = { ...draft };
  delete next[bound];
  return next;
}

/**
 * Returns true when the field consumed Escape by reverting an edit in progress.
 *
 * Radix listens for Escape on `document` in the CAPTURE phase, so a handler on
 * the input can never run first. The popover instead offers each field a chance
 * to claim the key through `onEscapeKeyDown` before it dismisses.
 */
export type EscapeConsumer = () => boolean;

export const FilterEscapeContext = createContext<{
  register: (consumer: EscapeConsumer) => () => void;
} | null>(null);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toText = (value?: number) => (value === undefined ? '' : String(value));

export default function FilterRangeField({
  field,
  idPrefix,
  labelId,
}: {
  field: FilterRangeFieldDescriptor;
  idPrefix: string;
  labelId: string;
}) {
  const [draft, setDraft] = useState<Draft>({});
  const activeThumb = useRef<0 | 1>(0);
  const boxRowRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);

  const { min, max, value, onChange } = field;
  const scale = useMemo(
    () => field.scale ?? linearScale({ min, max, step: field.step }),
    [field.scale, field.step, min, max]
  );

  // A navigation landed, so the in-flight buffer is stale.
  useEffect(() => {
    setDraft({});
  }, [value.min, value.max]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const escape = useContext(FilterEscapeContext);

  useEffect(
    () =>
      escape?.register(() => {
        const focused = document.activeElement as HTMLElement | null;
        if (!focused || !boxRowRef.current?.contains(focused)) return false;

        const bound = focused.dataset?.bound as Bound | undefined;
        if (bound === undefined || draftRef.current[bound] === undefined) {
          return false;
        }

        setDraft((current) => dropBound(current, bound));
        return true;
      }),
    [escape]
  );

  const read = (bound: Bound) => {
    const entry = draft[bound];
    return entry === undefined ? value[bound] : entry.value;
  };

  const minValue = read('min');
  const maxValue = read('max');

  const valueLabel = field.valueLabel ?? field.label;
  const format = field.format ?? String;
  const isHalf = field.span === 'half';
  const showSlider = field.slider !== false;
  // Six-plus digit bounds (rank tops out at 1,000,000) clip inside w-16.
  const boxWidth = isHalf
    ? 'w-12'
    : Math.max(String(min).length, String(max).length) > 5
      ? 'w-20'
      : 'w-16';

  const clampToBound = (bound: Bound, next: number) =>
    bound === 'min'
      ? clamp(next, min, maxValue ?? max)
      : clamp(next, minValue ?? min, max);

  const commit = (bound: Bound, next: number | undefined) => {
    setDraft((current) => dropBound(current, bound));
    onChange({
      ...value,
      [bound]: next === undefined ? undefined : clampToBound(bound, next),
    });
  };

  const handleText = (bound: Bound, text: string) => {
    const trimmed = text.trim();
    const parsed = Number(trimmed);

    setDraft((current) => ({
      ...current,
      [bound]: {
        text,
        value:
          trimmed === ''
            ? undefined
            : Number.isFinite(parsed)
              ? parsed
              : // Non-numeric keystroke: hold the last good number.
                (current[bound]?.value ?? value[bound]),
      },
    }));
  };

  const revert = (bound: Bound) =>
    setDraft((current) => dropBound(current, bound));

  const commitText = (bound: Bound) => {
    const entry = draft[bound];
    if (entry === undefined) return;

    const trimmed = entry.text.trim();
    if (trimmed === '') {
      commit(bound, undefined);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      // Unparseable reverts to the last committed value, never to zero.
      revert(bound);
      return;
    }

    commit(bound, scale.snap(parsed));
  };

  // An absent bound pins its thumb to that end of the track. Out-of-range
  // values from an old link pin too, but keep their text verbatim.
  const positions: [number, number] = [
    minValue === undefined ? SLIDER_MIN : scale.toPosition(minValue),
    maxValue === undefined ? SLIDER_MAX : scale.toPosition(maxValue),
  ];

  const boxProps = (bound: Bound) => {
    const isMin = bound === 'min';

    return {
      id: `${idPrefix}-${field.id}-${bound}`,
      'data-bound': bound,
      type: 'text' as const,
      // `type="number"` loses a 64px box to the spinner and Chrome silently
      // discards intermediate text.
      inputMode: 'decimal' as const,
      autoComplete: 'off',
      'aria-label': `${isMin ? 'Minimum' : 'Maximum'} ${valueLabel}`,
      placeholder: String(isMin ? min : max),
      value: draft[bound]?.text ?? toText(value[bound]),
      className: cn('h-8 px-2 text-center', boxWidth),
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        handleText(bound, event.target.value),
      onBlur: () => commitText(bound),
      // Escape is claimed through FilterEscapeContext, not from here.
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        commitText(bound);
      },
    };
  };

  return (
    <>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span id={labelId} className="min-w-0 truncate text-sm font-medium">
          {field.label}
        </span>
        <div ref={boxRowRef} className="flex shrink-0 items-center gap-1">
          <Input {...boxProps('min')} />
          <span aria-hidden="true" className="text-sm text-muted-foreground">
            –
          </span>
          <Input {...boxProps('max')} />
        </div>
      </div>

      {field.description ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {field.description}
        </p>
      ) : null}

      {showSlider ? (
        <Slider
          data-testid={`${idPrefix}-${field.id}-slider`}
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          minStepsBetweenThumbs={0}
          value={positions}
          onValueChange={(next) => {
            const minDifference = Math.abs(next[0] - positions[0]);
            const maxDifference = Math.abs(next[1] - positions[1]);
            const moved =
              minDifference === maxDifference
                ? activeThumb.current
                : minDifference > maxDifference
                  ? 0
                  : 1;
            activeThumb.current = moved;

            const bound: Bound = moved === 0 ? 'min' : 'max';
            const dragged = clampToBound(
              bound,
              scale.fromPosition(next[moved])
            );

            // Pending only - one history entry per drag, written on release.
            setDraft((current) => ({
              ...current,
              [bound]: { text: String(dragged), value: dragged },
            }));
          }}
          onValueCommit={(next) => {
            const moved = activeThumb.current;
            const bound: Bound = moved === 0 ? 'min' : 'max';
            commit(bound, scale.fromPosition(next[moved]));
          }}
          getThumbProps={(index) => {
            const isMin = index === 0;
            const bound: Bound = isMin ? 'min' : 'max';
            const current =
              (isMin ? minValue : maxValue) ?? (isMin ? min : max);

            return {
              'aria-label': `${isMin ? 'Minimum' : 'Maximum'} ${valueLabel}`,
              'aria-valuemin': isMin ? min : (minValue ?? min),
              'aria-valuemax': isMin ? (maxValue ?? max) : max,
              'aria-valuenow': current,
              'aria-valuetext': format(current),
              onFocus: () => {
                activeThumb.current = isMin ? 0 : 1;
              },
              onPointerDown: () => {
                activeThumb.current = isMin ? 0 : 1;
              },
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
      ) : null}
    </>
  );
}
