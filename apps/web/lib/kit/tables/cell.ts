import type * as React from 'react';

import { EMPTY_VALUE } from '@/lib/kit/format/empty';

/**
 * True for a cell with nothing to show: `null`, `undefined`, `false`, an
 * empty or blank string, or the em dash the number and date formatters
 * print for a missing value. `0` is a value.
 */
export function isMissingValue(value: React.ReactNode): boolean {
  if (value === null || value === undefined || value === false) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' || trimmed === EMPTY_VALUE;
  }
  return false;
}

/** Breakpoints a column can appear from; below it the column is hidden. */
export type ColumnBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

// Spelled out so Tailwind finds every class.
const SHOW_FROM: Record<ColumnBreakpoint, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

/** The classes that hide a column below `breakpoint`. */
export function showFromClass(breakpoint: ColumnBreakpoint | undefined) {
  return breakpoint ? SHOW_FROM[breakpoint] : undefined;
}
