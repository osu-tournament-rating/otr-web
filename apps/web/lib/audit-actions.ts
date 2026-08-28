import { AuditActionType, VerificationStatus } from '@otr/core/osu';
import type { AuditEventAction } from '@/lib/orpc/schema/audit';

export const ACTION_LABELS: Record<AuditEventAction, string> = {
  verification: 'verified',
  rejection: 'rejected',
  pre_verification: 'pre-verified',
  pre_rejection: 'pre-rejected',
  submission: 'submitted',
  update: 'updated',
  deletion: 'deleted',
};

/** Noun form of {@link ACTION_LABELS}. */
export const ACTION_NOUNS: Record<AuditEventAction, string> = {
  verification: 'verification',
  rejection: 'rejection',
  pre_verification: 'pre-verification',
  pre_rejection: 'pre-rejection',
  submission: 'submission',
  update: 'update',
  deletion: 'deletion',
};

/** Matches the colours `VerificationBadge` gives each status. */
export const ACTION_TEXT_COLORS: Record<AuditEventAction, string> = {
  verification: 'text-green-600 dark:text-green-400',
  pre_verification: 'text-green-600 dark:text-green-400',
  rejection: 'text-red-600 dark:text-red-400',
  pre_rejection: 'text-warning',
  submission: 'text-blue-600 dark:text-blue-400',
  update: 'text-blue-600 dark:text-blue-400',
  deletion: 'text-red-600 dark:text-red-400',
};

/** Classifies the semantic action from an entity's changes. */
export function classifyAction(
  actionType: AuditActionType,
  sampleChanges: Record<string, unknown> | null
): AuditEventAction {
  if (actionType === AuditActionType.Created) return 'submission';
  if (actionType === AuditActionType.Deleted) return 'deletion';

  if (!sampleChanges) return 'update';

  const changes = sampleChanges as Record<
    string,
    { originalValue: unknown; newValue: unknown }
  >;

  const vsChange = changes.verificationStatus ?? changes.verification_status;

  if (vsChange?.newValue !== undefined) {
    const newStatus = vsChange.newValue as number;

    switch (newStatus) {
      case VerificationStatus.Verified:
        return 'verification';
      case VerificationStatus.Rejected:
        return 'rejection';
      case VerificationStatus.PreVerified:
        return 'pre_verification';
      case VerificationStatus.PreRejected:
        return 'pre_rejection';
    }
  }

  return 'update';
}
