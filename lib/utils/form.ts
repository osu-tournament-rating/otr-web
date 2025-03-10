import {
  Operation,
  OperationType,
} from '@osu-tournament-rating/otr-api-client';

/**
 * Generate JSON Patch Replace {@link Operation}s by comparing two objects
 */
export function createPatchOperations<T extends object>(
  orig: T,
  patched: T
): Operation[] {
  return Array.from(new Set([...Object.keys(orig), ...Object.keys(patched)]))
    .filter(
      (k) =>
        typeof orig[k as keyof T] !== 'object' &&
        orig[k as keyof T] !== patched[k as keyof T]
    )
    .map<Operation>((k) => ({
      operationType: OperationType.Replace,
      op: 'replace',
      path: `/${k}`,
      value: patched[k as keyof T],
    }));
}
