export const OperationType = {
  Add: 'add',
  Remove: 'remove',
  Replace: 'replace',
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

export type Operation = {
  op: OperationType;
  path: string;
  value?: unknown;
  /**
   * Non-standard field maintained for legacy compatibility. Consumers expect
   * both the JSON Patch verb (`op`) and a camelCase variant.
   */
  operationType?: OperationType;
};

/**
 * Check if a string is intended to be parsed as a date
 */
function isValidDateString(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  // Check for ISO 8601 format patterns
  const isoPattern =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
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

  return commonDatePatterns.some((pattern) => pattern.test(str));
}

/**
 * Check if two values represent the same date/time, handling timezone differences
 */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' && isValidDateString(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function areDatesEqual(orig: unknown, patched: unknown): boolean {
  if (
    orig === null ||
    orig === undefined ||
    patched === null ||
    patched === undefined
  ) {
    return orig === patched;
  }

  const origDate = toDate(orig);
  const patchedDate = toDate(patched);

  if (origDate && patchedDate) {
    return origDate.getTime() === patchedDate.getTime();
  }

  // Not dates, use regular comparison
  return orig === patched;
}

const normalizeValue = (value: unknown) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const isSkippableObject = (value: unknown) =>
  value !== null && typeof value === 'object' && !(value instanceof Date);

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
        patched[k as keyof T] !== undefined &&
        !excludeFields.includes(k as keyof T) &&
        !isSkippableObject(orig[k as keyof T]) &&
        !isSkippableObject(patched[k as keyof T]) &&
        !areDatesEqual(orig[k as keyof T], patched[k as keyof T]) &&
        normalizeValue(orig[k as keyof T]) !==
          normalizeValue(patched[k as keyof T])
    )
    .map<Operation>((k) => ({
      operationType: OperationType.Replace,
      op: 'replace',
      path: `/${k}`,
      value: normalizeValue(patched[k as keyof T]),
    }));
}
