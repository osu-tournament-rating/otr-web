import { Callout } from '@/components/kit/feedback/Callout';
import { resolveMaintenanceWindowActive } from '@/lib/maintenance-window';

type MaintenanceBannerProps = {
  headers: Headers;
};

/** The strip under the site header during the weekly rating run. */
export default function MaintenanceBanner({ headers }: MaintenanceBannerProps) {
  if (!resolveMaintenanceWindowActive(headers)) {
    return null;
  }

  return (
    <Callout
      tone="warning"
      variant="banner"
      role="status"
      data-testid="maintenance-window-banner"
    >
      Ratings are pending recalculation, performance may be degraded
    </Callout>
  );
}
