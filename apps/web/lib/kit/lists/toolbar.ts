/**
 * Which row of a ListToolbar each slot goes on. The toolbar has up to two
 * rows above its active-filter chips:
 *
 * - The search row: `leading`, the search field, then sort and Filters on
 *   the right. Only a list with a search has it.
 * - The scope row: `leading` (when there is no search), scope, ruleset
 *   chips, view options and the count. Without a search, sort and Filters
 *   join it on the right, so a list with no search is one strip.
 *
 * The count sits on the scope row, or beside the search when nothing else
 * would share a scope row with it, so it never gets a row of its own.
 */
export type ListToolbarRow = 'search' | 'scope';

export interface ListToolbarSlots {
  search?: boolean;
  leading?: boolean;
  sort?: boolean;
  filters?: boolean;
  scope?: boolean;
  rulesets?: boolean;
  view?: boolean;
  count?: boolean;
}

export interface ListToolbarLayout {
  /** Draws the search row. */
  searchRow: boolean;
  /** Draws the scope row. */
  scopeRow: boolean;
  /** Where `leading` goes, or `null` without one. */
  leading: ListToolbarRow | null;
  /** Where sort and Filters go, or `null` without either. */
  controls: ListToolbarRow | null;
  /** Where the count goes, or `null` without one. */
  count: ListToolbarRow | null;
}

export function getListToolbarLayout(
  slots: ListToolbarSlots
): ListToolbarLayout {
  const hasControls = Boolean(slots.sort || slots.filters);

  if (slots.search) {
    const scopeContent = Boolean(slots.scope || slots.rulesets || slots.view);
    return {
      searchRow: true,
      scopeRow: scopeContent,
      leading: slots.leading ? 'search' : null,
      controls: hasControls ? 'search' : null,
      count: slots.count ? (scopeContent ? 'scope' : 'search') : null,
    };
  }

  return {
    searchRow: false,
    scopeRow: Boolean(
      slots.leading ||
      slots.scope ||
      slots.rulesets ||
      slots.view ||
      slots.count ||
      hasControls
    ),
    leading: slots.leading ? 'scope' : null,
    controls: hasControls ? 'scope' : null,
    count: slots.count ? 'scope' : null,
  };
}
