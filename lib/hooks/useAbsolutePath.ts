'use client';

import { usePathname } from 'next/navigation';

/**
 * A client component hook for reading
 * the current page's absolute URL path
 * @returns Current page's absolute URL path
 */
export function useAbsolutePath() {
  const path = usePathname();

  return window.location.origin + path;
}
