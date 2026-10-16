import {
  AdminReportsFrame,
  AdminReportsPanelSkeleton,
} from './AdminReportsFrame';

export default function AdminReportsLoading() {
  return (
    <AdminReportsFrame>
      <AdminReportsPanelSkeleton />
    </AdminReportsFrame>
  );
}
