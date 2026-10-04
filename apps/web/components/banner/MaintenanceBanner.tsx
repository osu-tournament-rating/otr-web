import { ratingRecalculationTracker } from '@/lib/db/rating-recalculation';
import { isMaintenanceWindowActive } from '@/lib/maintenance-window';

type MaintenanceBannerProps = {
  headers: Headers;
};

/** Hidden when the check fails, so a database error never breaks the layout. */
const isBannerShown = async (headers: Headers): Promise<boolean> => {
  try {
    return await isMaintenanceWindowActive(headers, ratingRecalculationTracker);
  } catch (error) {
    console.error('[maintenance] Failed to resolve the banner state', error);
    return false;
  }
};

export default async function MaintenanceBanner({
  headers,
}: MaintenanceBannerProps) {
  if (!(await isBannerShown(headers))) {
    return null;
  }

  return (
    <div
      data-testid="maintenance-window-banner"
      role="status"
      className="w-full border-b border-warning/50 bg-warning/15 px-4 py-2 text-center"
    >
      <p className="text-xs font-medium text-warning-foreground">
        Ratings are being recalculated. Some features are paused until new
        ratings are published, and performance may be degraded.
      </p>
    </div>
  );
}
