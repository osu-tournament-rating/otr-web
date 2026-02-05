import { AuditEntityType } from '@otr/core/osu';
import type { AuditGroupedEntry } from '@/lib/orpc/schema/audit';

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

export type BatchOperationType = 'verification' | 'rejection' | 'bulk_update';

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
 * Get timestamp in ms from ISO string
 */
function getTimestamp(isoString: string): number {
  return new Date(isoString).getTime();
}

/**
 * Determine the operation type from the groups
 */
function determineOperationType(groups: AuditGroupedEntry[]): BatchOperationType {
  // Check if any group contains a rejection-related change
  for (const group of groups) {
    if (group.changedFields.includes('rejectionReason')) {
      return 'rejection';
    }
  }

  // If verification-related fields changed, it's a verification
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

    // Only create a batch if we have multiple entity types
    if (currentEntityTypes.size >= MIN_ENTITY_TYPES_FOR_BATCH) {
      result.push(createBatchOperation(currentBatch));
    } else {
      // Not enough entity types - add as individual groups
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
