'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * How long the last filter edit sits before it navigates. Long enough to tab
 * across the popover's boxes and fill several of them without paying for a
 * round trip per cell.
 */
export const FILTER_APPLY_DELAY = 600;

/**
 * Marks the popover's field grid. `FilterPopover` sets it; the countdown below
 * reads it to tell a filter box apart from every other input on the page (the
 * search box keeps searching as it is typed).
 */
export const FILTER_FIELD_SCOPE_ATTRIBUTE = 'data-filter-fields';

const TEXT_ENTRY_TYPES = new Set([
  'text',
  'search',
  'number',
  'date',
  'email',
  'tel',
  'url',
]);

let sliderDragging = false;
const dragListeners = new Set<() => void>();

/**
 * Reported by `FilterRangeField` around a pointer drag. A drag emits a value on
 * every pointer move, so an apply landing mid-drag would re-render the track
 * out from under the pointer.
 *
 * Module state rather than context: only one filter surface is ever mounted,
 * and the countdown lives above the popover that owns the slider.
 */
export function setFilterSliderDragging(dragging: boolean) {
  if (sliderDragging === dragging) return;
  sliderDragging = dragging;
  for (const listener of dragListeners) listener();
}

/** True while the user is still working a control the apply would disturb. */
function isEditingFilter() {
  if (sliderDragging) return true;

  const active = document.activeElement;
  return (
    active instanceof HTMLInputElement &&
    TEXT_ENTRY_TYPES.has(active.type) &&
    active.closest(`[${FILTER_FIELD_SCOPE_ATTRIBUTE}]`) !== null
  );
}

/**
 * Debounces filter navigations, and holds them back entirely while a filter box
 * has focus or a slider is mid-drag. The countdown only starts once the user is
 * between controls, so tabbing from box to box collects every edit into one
 * navigation.
 *
 * Callers own their optimistic state: `apply` receives the value to commit, and
 * the UI is expected to already show it.
 */
export function useDeferredFilterApply<T>(
  apply: (value: T) => void,
  delay: number = FILTER_APPLY_DELAY
) {
  const applyRef = useRef(apply);
  const pendingRef = useRef<{ value: T } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    applyRef.current = apply;
  }, [apply]);

  const flush = useCallback(() => {
    window.clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) applyRef.current(pending.value);
  }, []);

  const arm = useCallback(() => {
    window.clearTimeout(timerRef.current);
    if (!pendingRef.current || isEditingFilter()) return;
    timerRef.current = window.setTimeout(flush, delay);
  }, [delay, flush]);

  const schedule = useCallback(
    (value: T) => {
      pendingRef.current = { value };
      arm();
    },
    [arm]
  );

  /** For deliberate one-shot actions (submitting a search, sorting, clearing). */
  const applyNow = useCallback(
    (value: T) => {
      pendingRef.current = { value };
      flush();
    },
    [flush]
  );

  const cancel = useCallback(() => {
    window.clearTimeout(timerRef.current);
    pendingRef.current = null;
  }, []);

  useEffect(() => {
    // Focus leaving a box, or a drag ending, is what re-opens the countdown.
    // `focusout` alone would start it while focus is still in flight, so
    // `focusin` re-arms (and re-blocks) once the next control has it.
    document.addEventListener('focusin', arm);
    document.addEventListener('focusout', arm);
    dragListeners.add(arm);

    return () => {
      document.removeEventListener('focusin', arm);
      document.removeEventListener('focusout', arm);
      dragListeners.delete(arm);
    };
  }, [arm]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { schedule, applyNow, cancel };
}
