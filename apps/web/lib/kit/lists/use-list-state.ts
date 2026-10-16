'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useRef,
  useTransition,
} from 'react';

import {
  applyListPatch,
  clearListFilters,
  countActiveFilters,
  listStateHref,
  listStatesEqual,
  parseListState,
  type ListParams,
  type ListState,
} from './params';

export interface ListStateUpdateOptions {
  /**
   * `push` (default) makes the change a step the back button undoes;
   * `replace` overwrites the current entry.
   */
  history?: 'push' | 'replace';
}

export interface UseListStateResult<P extends ListParams> {
  /** The state to render: the address, plus any change still navigating. */
  state: ListState<P>;
  /**
   * Merges `patch` into the state and navigates. Changing anything but the
   * page sends the list back to page 1.
   */
  setState: (
    patch:
      | Partial<ListState<P>>
      | ((current: ListState<P>) => Partial<ListState<P>>),
    options?: ListStateUpdateOptions
  ) => void;
  /** "Clear all": resets filter-role params only. */
  clearFilters: () => void;
  /** The number for the Filters button. */
  activeFilterCount: number;
  /** True while the server renders the new state. */
  isPending: boolean;
  /**
   * A link to this list with `patch` applied, such as a pagination link. A
   * link into another list ("See all") uses `listStateHref` with that
   * list's spec instead.
   */
  hrefFor: (patch: Partial<ListState<P>>) => string;
}

/**
 * The list's state, read from and written to the page address, so a reload
 * or a shared link shows the same list. `params` must be a module-level
 * `defineListParams` spec, the same one the server page parses.
 *
 * Changes render optimistically: controls show the new value at once while
 * the server renders the page for it. The page must render dynamically
 * (it reads `searchParams`), or wrap this component in `<Suspense>`.
 */
export function useListState<P extends ListParams>(
  params: P
): UseListStateResult<P> {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const addressState = useMemo(
    () => parseListState(params, searchParams),
    [params, searchParams]
  );
  const [state, setOptimisticState] = useOptimistic(addressState);
  const [isPending, startTransition] = useTransition();

  // Rapid changes build on each other, not on the last render's state.
  const latest = useRef(state);
  useLayoutEffect(() => {
    latest.current = state;
  }, [state]);

  const navigate = useCallback(
    (next: ListState<P>, history: 'push' | 'replace') => {
      if (listStatesEqual(params, latest.current, next)) return;
      const href = listStateHref(pathname, params, next, searchParams);
      latest.current = next;
      startTransition(() => {
        setOptimisticState(next);
        router[history](href, { scroll: false });
      });
    },
    [params, pathname, router, searchParams, setOptimisticState]
  );

  const setState = useCallback<UseListStateResult<P>['setState']>(
    (patch, { history = 'push' } = {}) => {
      const current = latest.current;
      const resolved = typeof patch === 'function' ? patch(current) : patch;
      navigate(applyListPatch(params, current, resolved), history);
    },
    [navigate, params]
  );

  const clearFilters = useCallback(() => {
    navigate(clearListFilters(params, latest.current), 'push');
  }, [navigate, params]);

  const hrefFor = useCallback(
    (patch: Partial<ListState<P>>) =>
      listStateHref(
        pathname,
        params,
        applyListPatch(params, addressState, patch),
        searchParams
      ),
    [addressState, params, pathname, searchParams]
  );

  return {
    state,
    setState,
    clearFilters,
    activeFilterCount: countActiveFilters(params, state),
    isPending,
    hrefFor,
  };
}
