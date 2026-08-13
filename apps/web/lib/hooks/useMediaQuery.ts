import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/**
 * Below Tailwind's `sm` breakpoint (640px), where a chart has to thin its ticks
 * and shrink its marks to stay readable.
 */
export function useIsNarrowChart(): boolean {
  return useMediaQuery('(max-width: 639px)');
}
