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

/**
 * A client component hook for reading
 * the current page's absolute URL path,
 * but does not allow /unauthorized in the path.
 *
 * Useful for specifying log in and log out redirect URLs.
 * @returns Current page's absolute URL path, unless on /unauthorized
 */
export function useAuthRedirectPath() {
  let path = usePathname();

  if (path === '/unauthorized') {
    path = '/';
  }

  return window.location.origin + path;
}
