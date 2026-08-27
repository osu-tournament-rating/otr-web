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
