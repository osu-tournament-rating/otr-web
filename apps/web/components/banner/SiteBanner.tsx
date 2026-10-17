'use client';

import { Callout } from '@/components/kit/feedback/Callout';
import { useSession } from '@/lib/hooks/useSession';

export const MAINTENANCE_NOTICE =
  'Ratings are pending recalculation, performance may be degraded';
export const SIGNED_OUT_NOTICE =
  'Some features are not available while signed out.';

/**
 * The one strip under the site header. During the weekly rating run it is
 * the maintenance warning; a signed-out visitor sees the signed-out note
 * inside that same strip, never as a second banner stacked under it.
 */
export function SiteBannerContent({
  maintenance,
  signedIn,
}: {
  /** Whether the weekly maintenance window is active. */
  maintenance: boolean;
  signedIn: boolean;
}) {
  if (maintenance) {
    return (
      <Callout
        tone="warning"
        variant="banner"
        role="status"
        data-testid="maintenance-window-banner"
      >
        {signedIn ? (
          MAINTENANCE_NOTICE
        ) : (
          <>
            {MAINTENANCE_NOTICE}.{' '}
            <span data-testid="signed-out-notice">{SIGNED_OUT_NOTICE}</span>
          </>
        )}
      </Callout>
    );
  }

  if (!signedIn) {
    return (
      <Callout variant="banner" tone="info" data-testid="signed-out-notice">
        {SIGNED_OUT_NOTICE}
      </Callout>
    );
  }

  return null;
}

/** The site banner for the current visitor; the root layout resolves the window. */
export default function SiteBanner({ maintenance }: { maintenance: boolean }) {
  const user = useSession();

  return <SiteBannerContent maintenance={maintenance} signedIn={!!user} />;
}
