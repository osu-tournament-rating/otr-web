'use client';

import { usePathname } from 'next/navigation';

/** The current page's absolute URL. */
export function useAbsolutePath() {
  const path = usePathname();

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_BASE_URL ?? '');
  return origin + path;
}

/** The current page's absolute URL for a login or logout redirect, never `/unauthorized`. */
export function useAuthRedirectPath() {
  let path = usePathname();

  if (path === '/unauthorized') {
    path = '/';
  }

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_BASE_URL ?? '');
  return origin + path;
}
