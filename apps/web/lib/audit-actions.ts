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
