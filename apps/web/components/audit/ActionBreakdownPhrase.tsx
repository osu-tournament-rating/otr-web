import type { AuditEventActionCount } from '@/lib/orpc/schema/audit';
import { ACTION_LABELS } from '@/lib/audit-actions';
import { formatCount } from '@/lib/kit/format/number';

/** "verified 115, rejected 3", in plain words. */
export function formatActionBreakdown(
  breakdown: readonly AuditEventActionCount[]
): string {
  return breakdown
    .map((part) => `${ACTION_LABELS[part.action]} ${formatCount(part.count)}`)
    .join(', ');
}
