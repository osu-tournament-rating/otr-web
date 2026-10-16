/**
 * What RangeFilter's number boxes do with typed text. Dragging a thumb
 * snaps to the slider's stops; typing never does, so "1,234" stays 1,234
 * rather than jumping to the nearest stop.
 */

import type { NumericScale } from '@/lib/filters/scale';

export type RangeBound = 'min' | 'max';

/** Accepts `1,000` and `1000`; anything else is not a number. */
export function parseRangeBox(text: string): number | undefined {
  const cleaned = text.replace(/,/g, '').trim();
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * True when every stop of `scale` is a whole number, such as ranks or match
 * counts: a half step past its start snaps to a whole number.
 */
export function isWholeNumberScale(scale: NumericScale): boolean {
  return (
    Number.isInteger(scale.min) &&
    Number.isInteger(scale.snap(Math.min(scale.min + 0.5, scale.max)))
  );
}

/**
 * The value a typed bound commits: exactly what was typed, held inside the
 * domain and on its side of the other bound. A whole-number domain rounds a
 * typed fraction to the nearest whole number, because the address would
 * drop it otherwise.
 */
export function resolveTypedBound(
  typed: number,
  options: {
    bound: RangeBound;
    min: number;
    max: number;
    /** The other bound's current value, if it has one. */
    other?: number;
    integer?: boolean;
  }
): number {
  const { bound, min, max, other, integer = false } = options;
  const low = bound === 'min' ? min : (other ?? min);
  const high = bound === 'min' ? (other ?? max) : max;
  const held = Math.min(Math.max(typed, low), high);
  if (!integer) return held;
  const rounded = Math.round(held);
  // Rounding must not step back over a bound that is itself a fraction.
  return Math.min(Math.max(rounded, Math.ceil(low)), Math.floor(high));
}
