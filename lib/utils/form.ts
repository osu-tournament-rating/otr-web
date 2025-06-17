import {
  Operation,
  OperationType,
} from '@osu-tournament-rating/otr-api-client';

/**
 * Check if a string is intended to be parsed as a date
 */
function isValidDateString(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }
  
  // Check for ISO 8601 format patterns
  const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  if (isoPattern.test(str)) {
    return true;
  }
  
  // Check for other common date formats
  const commonDatePatterns = [
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY or M/D/YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    /^\w{3}\s+\d{1,2}\s+\d{4}$/, // Mon DD YYYY
    /^\d{1,2}-\w{3}-\d{4}$/, // DD-Mon-YYYY
  ];
  
  return commonDatePatterns.some(pattern => pattern.test(str));
}

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

  // Only attempt date parsing for strings that look like valid dates
  if (
    typeof orig === 'string' &&
    typeof patched === 'string' &&
    isValidDateString(orig) &&
    isValidDateString(patched)
  ) {
    return new Date(orig).getTime() === new Date(patched).getTime();
  }

  // Not dates, use regular comparison
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
