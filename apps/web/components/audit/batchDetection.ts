import { AuditEntityType, AuditActionType, VerificationStatus } from '@otr/core/osu';
import type { AuditGroupedEntry, AuditEntry } from '@/lib/orpc/schema/audit';

/** Extract the action user type from AuditGroupedEntry */
type AuditActionUser = NonNullable<AuditGroupedEntry['actionUser']>;

/** Fields that indicate a verification-related operation */
const VERIFICATION_FIELDS = new Set([
  'verificationStatus',
  'verifiedByUserId',
  'rejectionReason',
]);

/** Timestamp window (ms) for grouping related operations */
const BATCH_WINDOW_MS = 2000;

/** Minimum entity types required to consider it a batch operation */
const MIN_ENTITY_TYPES_FOR_BATCH = 2;

export type BatchOperationType =
  | 'submission'         // Entity created/submitted
  | 'verification'       // User verified
  | 'rejection'          // User rejected
  | 'pre_verification'   // System PreVerified
  | 'pre_rejection'      // System PreRejected
  | 'bulk_update';

export type BatchOperation = {
  kind: 'batch';
  type: BatchOperationType;
  groups: AuditGroupedEntry[];
  totalCount: number;
  latestCreated: string;
  actionUserId: number | null;
  actionUser: AuditActionUser | null;
  entityBreakdown: {
    entityType: AuditEntityType;
    count: number;
    groups: AuditGroupedEntry[];
  }[];
};

export type AuditDisplayItem =
  | { kind: 'group'; data: AuditGroupedEntry }
  | BatchOperation;

/**
 * Check if a group's changed fields are verification-related
 */
function isVerificationRelated(changedFields: string[]): boolean {
  return changedFields.some((field) => VERIFICATION_FIELDS.has(field));
}

/**
 * Check if ALL changed fields are verification-related (no other fields changed)
 */
function isVerificationOnlyChange(changedFields: string[]): boolean {
  return (
    changedFields.length > 0 &&
    changedFields.every((field) => VERIFICATION_FIELDS.has(field))
  );
}

/**
 * Extract the new verification status from entries' changes
 */
function getVerificationStatusChange(entries: AuditEntry[]): {
  newStatus: VerificationStatus | null;
} {
  for (const entry of entries) {
    const changes = entry.changes as Record<
      string,
      { originalValue: unknown; newValue: unknown }
    > | null;
    if (changes?.verificationStatus?.newValue !== undefined) {
      return { newStatus: changes.verificationStatus.newValue as VerificationStatus };
    }
  }
  return { newStatus: null };
}

/**
 * Check if rejection reason is being SET (not cleared) in any entries.
 * Returns true if newValue is non-zero, false if being cleared (to 0/None).
 */
function isRejectionReasonBeingSet(entries: AuditEntry[]): boolean {
  for (const entry of entries) {
    const changes = entry.changes as Record<
      string,
      { originalValue: unknown; newValue: unknown }
    > | null;
    if (changes?.rejectionReason?.newValue !== undefined) {
      const newValue = changes.rejectionReason.newValue;
      // Rejection reason is being SET if newValue is non-zero
      return typeof newValue === 'number' && newValue !== 0;
    }
  }
  return false;
}

/**
 * Get timestamp in ms from ISO string
 */
function getTimestamp(isoString: string): number {
  return new Date(isoString).getTime();
}

/**
 * Determine the operation type from the groups
 */
function determineOperationType(groups: AuditGroupedEntry[]): BatchOperationType {
  const firstGroup = groups[0];
  if (!firstGroup) return 'bulk_update';

  // If this is a creation action, it's a submission (not verification-related)
  // Creation actions set initial field values but aren't actually verify/reject operations
  const isCreation = groups.every((g) => g.actionType === AuditActionType.Created);
  if (isCreation) {
    return 'submission';
  }

  const isSystemAction = firstGroup.actionUserId === null;
  const { newStatus } = getVerificationStatusChange(firstGroup.entries);

  // Check for verification status changes with specific target status
  if (newStatus !== null) {
    // System actions: PreVerified or PreRejected
    if (isSystemAction) {
      if (newStatus === VerificationStatus.PreVerified) return 'pre_verification';
      if (newStatus === VerificationStatus.PreRejected) return 'pre_rejection';
    }
    // User actions: Verified or Rejected
    if (newStatus === VerificationStatus.Verified) return 'verification';
    if (newStatus === VerificationStatus.Rejected) return 'rejection';
  }

  // Fallback: check for rejection reason being SET (not cleared)
  for (const group of groups) {
    if (
      group.changedFields.includes('rejectionReason') &&
      isRejectionReasonBeingSet(group.entries)
    ) {
      return 'rejection';
    }
  }

  // Fallback: check for verification status field (without checking value)
  for (const group of groups) {
    if (group.changedFields.includes('verificationStatus')) {
      return 'verification';
    }
  }

  return 'bulk_update';
}

/**
 * Build entity breakdown from groups
 */
function buildEntityBreakdown(groups: AuditGroupedEntry[]): BatchOperation['entityBreakdown'] {
  const byEntityType = new Map<AuditEntityType, AuditGroupedEntry[]>();

  for (const group of groups) {
    const existing = byEntityType.get(group.entityType) || [];
    byEntityType.set(group.entityType, [...existing, group]);
  }

  // Order: Tournament, Match, Game, Score (hierarchical)
  const order = [
    AuditEntityType.Tournament,
    AuditEntityType.Match,
    AuditEntityType.Game,
    AuditEntityType.Score,
  ];

  return order
    .filter((et) => byEntityType.has(et))
    .map((entityType) => {
      const entityGroups = byEntityType.get(entityType)!;
      return {
        entityType,
        count: entityGroups.reduce((sum, g) => sum + g.count, 0),
        groups: entityGroups,
      };
    });
}

/**
 * Create a batch operation from a set of groups
 */
function createBatchOperation(groups: AuditGroupedEntry[]): BatchOperation {
  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);
  const latestCreated = groups[0].latestCreated; // Groups are already sorted by time desc

  return {
    kind: 'batch',
    type: determineOperationType(groups),
    groups,
    totalCount,
    latestCreated,
    actionUserId: groups[0].actionUserId,
    actionUser: groups[0].actionUser,
    entityBreakdown: buildEntityBreakdown(groups),
  };
}

/**
 * Detect batch operations from a list of grouped audit entries.
 *
 * A batch operation is detected when consecutive groups share:
 * - Same actionUserId
 * - Timestamps within 2 seconds
 * - Verification-related field changes
 * - Multiple entity types
 */
export function detectBatchOperations(
  groups: AuditGroupedEntry[]
): AuditDisplayItem[] {
  if (groups.length === 0) return [];

  const result: AuditDisplayItem[] = [];
  let currentBatch: AuditGroupedEntry[] = [];
  let currentEntityTypes = new Set<AuditEntityType>();
  let batchStartTime: number | null = null;

  function flushBatch() {
    if (currentBatch.length === 0) return;

    // Check if all changes are verification-only (no other fields changed)
    const allVerificationOnly = currentBatch.every((g) =>
      isVerificationOnlyChange(g.changedFields)
    );

    // Create batch if:
    // 1. Multiple entity types (existing cascade behavior), OR
    // 2. All changes are verification-only (even single entity type)
    const shouldCreateBatch =
      currentEntityTypes.size >= MIN_ENTITY_TYPES_FOR_BATCH ||
      allVerificationOnly;

    if (shouldCreateBatch) {
      result.push(createBatchOperation(currentBatch));
    } else {
      // Not enough entity types and not verification-only - add as individual groups
      for (const group of currentBatch) {
        result.push({ kind: 'group', data: group });
      }
    }

    currentBatch = [];
    currentEntityTypes = new Set();
    batchStartTime = null;
  }

  for (const group of groups) {
    const groupTime = getTimestamp(group.latestCreated);
    const isVerification = isVerificationRelated(group.changedFields);

    // Check if this group can be added to current batch
    const canAddToBatch =
      isVerification &&
      currentBatch.length > 0 &&
      group.actionUserId === currentBatch[0].actionUserId &&
      batchStartTime !== null &&
      Math.abs(groupTime - batchStartTime) <= BATCH_WINDOW_MS;

    if (canAddToBatch) {
      // Add to current batch
      currentBatch.push(group);
      currentEntityTypes.add(group.entityType);
    } else {
      // Flush current batch and start new one
      flushBatch();

      if (isVerification) {
        // Start a new potential batch
        currentBatch = [group];
        currentEntityTypes = new Set([group.entityType]);
        batchStartTime = groupTime;
      } else {
        // Not verification-related, add as standalone
        result.push({ kind: 'group', data: group });
      }
    }
  }

  // Flush any remaining batch
  flushBatch();

  return result;
}
