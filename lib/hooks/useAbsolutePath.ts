'use client';

import { usePathname } from 'next/navigation';

export function useAbsolutePath() {
  const path = usePathname();

  return window.location.origin + path;
}
