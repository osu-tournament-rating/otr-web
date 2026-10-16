'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  applyListPatch,
  listStateHref,
  parseListState,
  type ListParams,
  type ListState,
} from '@/lib/kit/lists/params';

/**
 * List state in the page address for a list the page already holds in
 * full, such as a tournament's matches or ratings. Like `useListState`, a
 * reload or a shared link shows the same order, but a change only rewrites
 * the address (`history.pushState`, which Next's router follows) instead of
 * rendering the page again on the server.
 */
export function useAddressListState<P extends ListParams>(params: P) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(
    () => parseListState(params, searchParams),
    [params, searchParams]
  );

  const setState = useCallback(
    (patch: Partial<ListState<P>>) => {
      const next = applyListPatch(params, state, patch);
      const href = listStateHref(pathname, params, next, searchParams);
      window.history.pushState(null, '', href);
    },
    [params, pathname, searchParams, state]
  );

  return { state, setState };
}
