import { AuditHistoryLoading } from '@/components/audit/AuditHistoryPage';

/** A beatmap sits outside the tournament hierarchy, so its history has no tabs. */
export default function BeatmapAuditLoading() {
  return <AuditHistoryLoading withTabs={false} />;
}
