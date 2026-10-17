import { AuditHistoryLoading } from '@/components/audit/AuditHistoryPage';

/** A score has no descendants, so its history has no tabs. */
export default function ScoreAuditLoading() {
  return <AuditHistoryLoading withTabs={false} />;
}
