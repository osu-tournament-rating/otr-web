export type NumericEnumValue<E extends Record<string, string | number>> =
  Extract<E[keyof E], number>;

export function coerceNumericEnumValue<
  E extends Record<string, string | number>,
>(
  enumObject: E,
  candidate: number | null | undefined
): NumericEnumValue<E> | undefined;

export function coerceNumericEnumValue<
  E extends Record<string, string | number>,
>(
  enumObject: E,
  candidate: number | null | undefined,
  fallback: NumericEnumValue<E>
): NumericEnumValue<E>;

export function coerceNumericEnumValue<
  E extends Record<string, string | number>,
>(
  enumObject: E,
  candidate: number | null | undefined,
  fallback?: NumericEnumValue<E>
): NumericEnumValue<E> | undefined {
  if (typeof candidate === 'number' && Number.isInteger(candidate)) {
    if (
      Object.prototype.hasOwnProperty.call(enumObject, candidate) &&
      typeof enumObject[candidate as unknown as keyof E] === 'string'
    ) {
      return candidate as NumericEnumValue<E>;
    }
  }

  return fallback;
}
