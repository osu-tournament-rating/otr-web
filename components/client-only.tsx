'use client';

/**
 * Component that can wrap components that should not be rendered by SSR
 * @see https://github.com/uidotdev/usehooks/issues/218#issuecomment-1835624086
 */

import { useIsClient } from '@uidotdev/usehooks';

export default function ClientOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  const isClient = useIsClient();

  // Render children if on client side, otherwise return null
  return isClient ? <>{children}</> : null;
}
