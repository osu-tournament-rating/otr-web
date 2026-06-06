import { resolveMaintenanceWindowActive } from '@/lib/maintenance-window';

type MaintenanceBannerProps = {
  headers: Headers;
};

export default function MaintenanceBanner({ headers }: MaintenanceBannerProps) {
  if (!resolveMaintenanceWindowActive(headers)) {
    return null;
  }

  return (
    <div
      data-testid="maintenance-window-banner"
      role="status"
      className="w-full border-b border-orange-500/50 bg-orange-500/15 px-4 py-2 text-center"
    >
      <p className="font-mono text-xs font-medium text-orange-800 dark:text-orange-200">
        Ratings are pending recalculation, performance may be degraded
      </p>
    </div>
  );
}
