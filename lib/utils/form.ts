import {
  Operation,
  OperationType,
} from '@osu-tournament-rating/otr-api-client';

/**
 * Check if two values represent the same date/time, handling timezone differences
 */
function areDatesEqual(orig: unknown, patched: unknown): boolean {
  if (
    orig === null ||
    orig === undefined ||
    patched === null ||
    patched === undefined
  ) {
    return orig === patched;
  }

  // Try to parse as dates
  const origDate = new Date(orig as string);
  const patchedDate = new Date(patched as string);

  // If both are valid dates, compare their time values
  if (!isNaN(origDate.getTime()) && !isNaN(patchedDate.getTime())) {
    return origDate.getTime() === patchedDate.getTime();
  }

  // If not dates, fall back to regular comparison
  return orig === patched;
}

/**
 * Generate JSON Patch Replace {@link Operation}s by comparing two objects
 */
export function createPatchOperations<T extends object>(
  orig: T,
  patched: T,
  excludeFields: (keyof T)[] = []
): Operation[] {
  return Array.from(new Set([...Object.keys(orig), ...Object.keys(patched)]))
    .filter(
      (k) =>
        typeof orig[k as keyof T] !== 'object' &&
        patched[k as keyof T] !== undefined &&
        !excludeFields.includes(k as keyof T) &&
        !areDatesEqual(orig[k as keyof T], patched[k as keyof T])
    )
    .map<Operation>((k) => ({
      operationType: OperationType.Replace,
      op: 'replace',
      path: `/${k}`,
      value: patched[k as keyof T],
    }));
}
