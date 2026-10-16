import type { AuditEntityType } from '@otr/core/osu';

import { ACTION_LABELS } from '@/lib/audit-actions';
import { entityNoun, formatAffectedCount } from '@/lib/audit-entity-types';
import type { AuditEventActionCount } from '@/lib/orpc/schema/audit';
import { formatCount } from '@/lib/kit/format/number';

/** "a", "a and b", "a, b, and c". */
function joinWords(words: readonly string[]): string {
  if (words.length <= 2) return words.join(' and ');
  return `${words.slice(0, -1).join(', ')}, and ${words[words.length - 1]}`;
}

function sumCounts(breakdown: readonly AuditEventActionCount[]): number {
  return breakdown.reduce((sum, part) => sum + part.count, 0);
}

/**
 * An event's outcomes as the verb of its sentence, after the actor:
 * "verified 3 and rejected 1 of 4 matches", or "pre-verified 12 matches"
 * for one outcome.
 */
export function formatBreakdownClause(
  breakdown: readonly AuditEventActionCount[],
  entityType: AuditEntityType,
  totalCount: number | null = null
): string {
  const affected = sumCounts(breakdown);
  const total = Math.max(totalCount ?? affected, affected);
  const verbs = joinWords(
    breakdown.map(
      (part) => `${ACTION_LABELS[part.action]} ${formatCount(part.count)}`
    )
  );
  const noun = entityNoun(entityType, total);

  return breakdown.length === 1 && total === affected
    ? `${verbs} ${noun}`
    : `${verbs} of ${formatCount(total)} ${noun}`;
}

/**
 * The two halves of `formatBreakdownSummary`, for a label that should wrap
 * between them on a narrow screen: ["58 matches:", "57 verified, 1
 * rejected"], or ["85 of 118 matches", "pre-verified"] for one outcome.
 */
export function getBreakdownSummaryParts(
  breakdown: readonly AuditEventActionCount[],
  entityType: AuditEntityType,
  totalCount: number | null = null
): readonly string[] {
  const counted = formatAffectedCount(
    entityType,
    sumCounts(breakdown),
    totalCount
  );

  if (breakdown.length <= 1) {
    return breakdown[0]
      ? [counted, ACTION_LABELS[breakdown[0].action]]
      : [counted];
  }
  return [
    `${counted}:`,
    breakdown
      .map((part) => `${formatCount(part.count)} ${ACTION_LABELS[part.action]}`)
      .join(', '),
  ];
}

/**
 * How many entities below an event it touched and what it left them as:
 * "58 matches: 57 verified, 1 rejected", "58 of 120 matches: …", or
 * "85 of 118 matches pre-verified" for one outcome.
 */
export function formatBreakdownSummary(
  breakdown: readonly AuditEventActionCount[],
  entityType: AuditEntityType,
  totalCount: number | null = null
): string {
  return getBreakdownSummaryParts(breakdown, entityType, totalCount).join(' ');
}
