import { AuditEntityType, AuditActionType, VerificationStatus } from '@otr/core/osu';
import type { AuditGroupSummary } from '@/lib/orpc/schema/audit';

/** Extract the action user type from AuditGroupSummary */
type AuditActionUser = NonNullable<AuditGroupSummary['actionUser']>;

/** Fields that indicate a verification-related operation */
const VERIFICATION_FIELDS = new Set([
  'verificationStatus',
  'verifiedByUserId',
  'rejectionReason',
]);

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
  groups: AuditGroupSummary[];
  totalCount: number;
  latestCreated: string;
  /** Earliest timestamp across all groups in the batch */
  earliestCreated: string;
  actionUserId: number | null;
  actionUser: AuditActionUser | null;
  entityBreakdown: {
    entityType: AuditEntityType;
    count: number;
    groups: AuditGroupSummary[];
  }[];
  /** Tournament name for the parent entity */
  tournamentName: string | null;
  /** Parent tournament ID for entity lookups */
  parentEntityId: number | null;
};

export type AuditDisplayItem =
  | { kind: 'group'; data: AuditGroupSummary }
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
 * Extract the new verification status from a group's sample changes
 */
function getVerificationStatusChange(sampleChanges: Record<string, unknown> | null): {
  newStatus: VerificationStatus | null;
} {
  if (!sampleChanges) return { newStatus: null };
  const changes = sampleChanges as Record<
    string,
    { originalValue: unknown; newValue: unknown }
  >;
  if (changes?.verificationStatus?.newValue !== undefined) {
    return { newStatus: changes.verificationStatus.newValue as VerificationStatus };
  }
  return { newStatus: null };
}

/**
 * Check if rejection reason is being SET (not cleared) in sample changes.
 * Returns true if newValue is non-zero, false if being cleared (to 0/None).
 */
function isRejectionReasonBeingSet(sampleChanges: Record<string, unknown> | null): boolean {
  if (!sampleChanges) return false;
  const changes = sampleChanges as Record<
    string,
    { originalValue: unknown; newValue: unknown }
  >;
  if (changes?.rejectionReason?.newValue !== undefined) {
    const newValue = changes.rejectionReason.newValue;
    return typeof newValue === 'number' && newValue !== 0;
  }
  return false;
}

/**
 * Determine the operation type from the groups
 */
function determineOperationType(groups: AuditGroupSummary[]): BatchOperationType {
  const firstGroup = groups[0];
  if (!firstGroup) return 'bulk_update';

  // If this is a creation action, it's a submission (not verification-related)
  const isCreation = groups.every((g) => g.actionType === AuditActionType.Created);
  if (isCreation) {
    return 'submission';
  }

  const isSystemAction = firstGroup.actionUserId === null;
  const { newStatus } = getVerificationStatusChange(firstGroup.sampleChanges);

  // Check for verification status changes with specific target status
  if (newStatus !== null) {
    if (isSystemAction) {
      if (newStatus === VerificationStatus.PreVerified) return 'pre_verification';
      if (newStatus === VerificationStatus.PreRejected) return 'pre_rejection';
    }
    if (newStatus === VerificationStatus.Verified) return 'verification';
    if (newStatus === VerificationStatus.Rejected) return 'rejection';
  }

  // Fallback: check for rejection reason being SET (not cleared)
  for (const group of groups) {
    if (
      group.changedFields.includes('rejectionReason') &&
      isRejectionReasonBeingSet(group.sampleChanges)
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
function buildEntityBreakdown(groups: AuditGroupSummary[]): BatchOperation['entityBreakdown'] {
  const byEntityType = new Map<AuditEntityType, AuditGroupSummary[]>();

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
function createBatchOperation(groups: AuditGroupSummary[]): BatchOperation {
  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);
  const latestCreated = groups[0].latestCreated;

  // Compute earliest timestamp across all groups in the batch
  const earliestCreated = groups.reduce(
    (earliest, g) =>
      g.earliestCreated < earliest ? g.earliestCreated : earliest,
    groups[0].earliestCreated
  );

  // Tournament name is now available on all groups via parentEntityId resolution
  const tournamentName = groups.find((g) => g.tournamentName)?.tournamentName ?? null;

  return {
    kind: 'batch',
    type: determineOperationType(groups),
    groups,
    totalCount,
    latestCreated,
    earliestCreated,
    actionUserId: groups[0].actionUserId,
    actionUser: groups[0].actionUser,
    entityBreakdown: buildEntityBreakdown(groups),
    tournamentName,
    parentEntityId: groups[0].parentEntityId,
  };
}

/**
 * Detect batch operations from a list of audit group summaries.
 *
 * Groups are batched together when consecutive groups share:
 * - Same actionUserId
 * - Same parentEntityId (same parent tournament)
 * - Verification-related field changes
 */
export function detectBatchOperations(
  groups: AuditGroupSummary[]
): AuditDisplayItem[] {
  if (groups.length === 0) return [];

  const result: AuditDisplayItem[] = [];
  let currentBatch: AuditGroupSummary[] = [];
  let currentKey: string | null = null;

  function flushBatch() {
    if (currentBatch.length === 0) return;

    const allVerificationOnly = currentBatch.every((g) =>
      isVerificationOnlyChange(g.changedFields)
    );

    const hasVerificationStatusChange = currentBatch.some((g) =>
      g.changedFields.includes('verificationStatus')
    );

    const entityTypes = new Set(currentBatch.map((g) => g.entityType));

    const shouldCreateBatch =
      entityTypes.size >= MIN_ENTITY_TYPES_FOR_BATCH ||
      allVerificationOnly ||
      hasVerificationStatusChange;

    if (shouldCreateBatch) {
      result.push(createBatchOperation(currentBatch));
    } else {
      for (const group of currentBatch) {
        result.push({ kind: 'group', data: group });
      }
    }

    currentBatch = [];
    currentKey = null;
  }

  for (const group of groups) {
    const isVerification = isVerificationRelated(group.changedFields);
    const groupKey = `${group.actionUserId}:${group.parentEntityId}`;

    const canAddToBatch =
      isVerification &&
      currentBatch.length > 0 &&
      groupKey === currentKey;

    if (canAddToBatch) {
      currentBatch.push(group);
    } else {
      flushBatch();

      if (isVerification) {
        currentBatch = [group];
        currentKey = groupKey;
      } else {
        result.push({ kind: 'group', data: group });
      }
    }
  }

  flushBatch();

  return result;
}
