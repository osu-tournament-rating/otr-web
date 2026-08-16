'use client';

/**
 * Wraps children that must not render during SSR.
 * @see https://github.com/uidotdev/usehooks/issues/218#issuecomment-1835624086
 */

import { useIsClient } from '@uidotdev/usehooks';

export default function ClientOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  const isClient = useIsClient();

  return isClient ? <>{children}</> : null;
}
