/**
 * The address side of `useListState`'s `shallow` option, for lists whose
 * rows are all on the client: the address changes in place, through the
 * History API that Next.js follows into `useSearchParams`, and the server
 * renders nothing.
 */

import {
  listStatesEqual,
  parseListState,
  type ListParams,
  type ListState,
  type SearchParamsInput,
} from './params';

/** The two History methods a shallow change uses. */
export type ShallowHistory = Pick<History, 'pushState' | 'replaceState'>;

/**
 * Writes `href` to the address without a navigation: a new history entry
 * for `push`, the current one overwritten for `replace`.
 */
export function writeShallowAddress(
  href: string,
  history: 'push' | 'replace',
  target: ShallowHistory = window.history
): void {
  if (history === 'replace') {
    target.replaceState(null, '', href);
  } else {
    target.pushState(null, '', href);
  }
}

/**
 * The query of an href in the form `useSearchParams().toString()` reports
 * it (`a=1&b=2`, no `?`), so a search a shallow change wrote and the one
 * that lands later compare equal.
 */
export function shallowSearchKey(href: string): string {
  return new URL(href, 'http://localhost').searchParams.toString();
}

export interface ShallowLanding {
  /** True when the address is one this list wrote itself. */
  own: boolean;
  /** This list's writes that have still to land, oldest first. */
  pending: string[];
}

/**
 * Sorts out an address change that reached `useSearchParams`. `pending`
 * holds the searches (`shallowSearchKey`) this list wrote and has not seen
 * land yet, oldest first; `landed` is the search that arrived.
 *
 * - One of its own writes: it and every older one have landed. A newer
 *   write may still be on its way, so the list keeps the newest state
 *   rather than step back to this one.
 * - Anything else (back and forward, a link, `router.push`): the address
 *   changed under the list, which follows it.
 */
export function landShallowAddress(
  pending: readonly string[],
  landed: string
): ShallowLanding {
  const index = pending.indexOf(landed);
  return index === -1
    ? { own: false, pending: [] }
    : { own: true, pending: pending.slice(index + 1) };
}

/**
 * The state a shallow list shows for the address `search`. `held` comes
 * back unchanged when it already matches, so React keeps the same object.
 */
export function syncShallowState<P extends ListParams>(
  params: P,
  held: ListState<P>,
  search: SearchParamsInput
): ListState<P> {
  const next = parseListState(params, search);
  return listStatesEqual(params, held, next) ? held : next;
}
