# Lists, search and filters

Everything that sits on top of a list: the toolbar strip, search, sort, ruleset chips, the scope switch, the filter panel and its fields, active-filter chips, and the list state in the page address.
The beatmap list is the reference. Components live in their own files under `@/components/kit/lists/`; the URL-state, search, sort, chip-label and calendar helpers, with unit tests, under `@/lib/kit/lists/`.

- [Rules at a glance](#rules-at-a-glance)
- [A list page, end to end](#a-list-page-end-to-end)
- [ListToolbar](#listtoolbar): the strip at the top of a list's panel
- [SearchField](#searchfield): the one search box
- [SortControl](#sortcontrol): key dropdown plus direction button
- [RulesetChips](#rulesetchips): filter a list by rulesets
- [RulesetSwitch](#rulesetswitch): one ruleset at a time
- [ScopeSwitch](#scopeswitch): All / Friends
- [ChoiceChip](#choicechip): one toggle chip
- [FilterPanel and FilterButton](#filterpanel-and-filterbutton): the Filters button and its panel
- [Filter fields](#filter-fields): `RangeFilter`, `ChoiceFilter`, `DayRangeFilter`, `SwitchFilter`, `FilterField`
- [DateField and Calendar](#datefield-and-calendar): a UTC day without the browser's date field
- [ActiveFilterChips](#activefilterchips): removable chips for active filters
- [useListState and list params](#useliststate-and-list-params): list state in the address
- [Sort state](#sort-state): `SortState`, shared with table headers

## Rules at a glance

- Every control that changes what a list shows is in the page address: search, sort, page, filters, ruleset, scope, tab. A reload or a shared link shows the same list. Defaults are left out of the address.
- One toolbar: search, sort and Filters on the first row; scope, ruleset chips, view options and the result count on the second; active-filter chips under both. It sits inside the list's panel, above the rows.
- Two heights, so each row lines up: the first row is 40px (the search field, the sort dropdown, its direction IconButton and the Filters button, all at the `lg` size); the second row and the active-filter row are 32px (the scope switch, ruleset chips, layout toggles, active-filter chips and the ghost `sm` "Clear all").
- Buttons are the controls family's: text buttons are `Button` (`@/components/kit/controls/Button`) and icon-only ones `IconButton` (`@/components/kit/controls/IconButton`), never `@/components/ui/button`. Chips, the scope switch's segments, layout toggles and calendar days are not buttons in that sense and keep their own look.
- Search waits 400ms after the last keystroke (`SEARCH_DEBOUNCE_MS`), Enter searches at once, a spinner shows until results land, and fewer than 2 characters shows "Type at least 2 characters to search." instead of searching.
- Sort is a dropdown plus a direction button, sharing `{ key, direction }` with sortable column headers.
- Filters apply as you change them. The Filters button shows how many are active. "Clear all" resets the filter panel's fields only; search, sort, ruleset, scope and tab stay.
- Rulesets are chips labelled osu!, taiko, catch, mania 4K, mania 7K: any number to filter a list, one at a time (`RulesetSwitch`) on the profile, stats and leaderboard.
- Nothing scrolls sideways on a phone: the toolbar wraps, chips wrap, and labels wrap instead of truncating.
- No browser date fields (`type="date"`); use `DateField`.

## A list page, end to end

Define the list's params once, at module level, in a file both the server page and the client toolbar import:

```ts
// app/tournaments/list-params.ts
import { RATED_RULESETS } from '@/lib/kit/format/ruleset';
import {
  arrayParam,
  dayRangeParam,
  defineListParams,
  pageParam,
  rangeParam,
  searchParam,
  sortParam,
} from '@/lib/kit/lists/params';
import { VERIFICATION_STATUS_ORDER } from '@/lib/kit/status/verification';

export const TOURNAMENT_LIST_PARAMS = defineListParams({
  q: searchParam(),
  page: pageParam(),
  sort: sortParam(['endTime', 'startTime', 'name'], {
    key: 'endTime',
    direction: 'desc',
  }),
  ruleset: arrayParam(RATED_RULESETS, { role: 'scope' }),
  status: arrayParam(VERIFICATION_STATUS_ORDER),
  rank: rangeParam({ min: 1, max: 1_000_000, integer: true }),
  date: dayRangeParam(),
});
```

The server page parses it and fetches; the client toolbar reads and writes it:

```tsx
// page.tsx (server)
const state = parseListState(TOURNAMENT_LIST_PARAMS, await searchParams);
// toApiFilter is the page's own mapping from list state to the procedure's input.
const data = await orpc.tournaments.list(toApiFilter(state));

// TournamentToolbar.tsx ('use client')
const list = useListState(TOURNAMENT_LIST_PARAMS);
const { state, setState } = list;

<ListToolbar
  label="Search and filter tournaments"
  search={
    <SearchField
      label="Search tournaments"
      placeholder="Search by name or abbreviation"
      value={state.q}
      pending={list.isPending}
      onSearch={(q) => setState({ q })}
    />
  }
  sort={
    <SortControl
      label="Sort tournaments by"
      options={SORT_OPTIONS}
      value={state.sort}
      onValueChange={(sort) => setState({ sort })}
    />
  }
  filters={
    <FilterPanel
      title="Filter tournaments"
      activeCount={list.activeFilterCount}
      onClearAll={list.clearFilters}
    >
      <ChoiceFilter label="Verification status" … />
      <RangeFilter label="Rank range" … />
      <DayRangeFilter label="Dates" … />
    </FilterPanel>
  }
  rulesets={
    <RulesetChips
      value={state.ruleset}
      onValueChange={(ruleset) => setState({ ruleset })}
    />
  }
  count={formatCountOf(data.total, 'tournament', 'tournaments')}
  activeFilters={
    <ActiveFilterChips filters={…} onClearAll={list.clearFilters} />
  }
/>;
```

The page with the list must render dynamically (it reads `searchParams`), or the toolbar must sit in `<Suspense>`, because `useListState` uses `useSearchParams`.

## ListToolbar

The strip at the top of a list's panel, laid out like the beatmap list. Pass only the slots the list has; the rows below it are the panel's own.

```tsx
import { ListToolbar } from '@/components/kit/lists/ListToolbar';

<Panel>
  <ListToolbar
    label="Search and filter players"
    search={<SearchField … />}
    filters={<FilterPanel …>…</FilterPanel>}
    scope={<ScopeSwitch … />}
    rulesets={<RulesetSwitch … />}
    count="12,483 players"
    activeFilters={<ActiveFilterChips … />}
  />
  <DataTable …/>
</Panel>;
```

Props that matter:

- `label`: names the toolbar, which is a `search` landmark ("Search and filter tournaments").
- First row: `search`, `sort`, `filters`. Without a sort, the Filters button stays beside the search box on phones.
- Second row: `scope` and `rulesets` on the left, `view` (layout toggles) and `count` on the right. `count` is already formatted with `formatCountOf` and announced politely. Layout toggles are a `ToggleGroup` of 32px (`size-8`) icon items with an `aria-label` each; leave tooltips off them, because a `TooltipTrigger`'s `data-state` replaces the item's `on`/`off`.
- `activeFilters`: `ActiveFilterChips`. Its row, and the divider above it, disappear when it renders nothing.
- When nothing matches, render `EmptyState` (`@/components/kit/feedback/EmptyState`) straight under the toolbar in place of the rows, with `clearFilters` when filter-role params are active (`activeFilterCount > 0`). Not a line of muted text.

Do:

- Put it first inside the list's Panel, above the rows or table, as the beatmap list does.
- Use it for every list: tournaments, beatmaps, the leaderboard, audit logs, reports, filter results.

Don't:

- Don't build a toolbar by hand. `components/beatmaps/list/BeatmapListFilter.tsx` is the reference it was copied from; `components/tournaments/list/TournamentListFilter.tsx` is a hand copy; the leaderboard's card title with a Filters button above the table (`app/leaderboard/page.tsx`, `components/leaderboard/LeaderboardFilter.tsx`) and the audit pages' row of dropdowns and a checkbox (`components/audit/AuditFilterBar.tsx`) are the legacy layouts.
- Don't let a toolbar scroll sideways or cut off its Filters button on phones (the leaderboard today).

Gallery anchors: `/admin/design#lists-toolbar`, `/admin/design#lists-toolbar-scope`, `/admin/design#lists-toolbar-view`

## SearchField

The one search box: a search icon that turns into a spinner while results load, a clear button, and a hint under the box while the term is too short.

```tsx
import { SearchField } from '@/components/kit/lists/SearchField';

<SearchField
  label="Search tournaments"
  placeholder="Search by name or abbreviation"
  value={state.q}
  pending={list.isPending}
  onSearch={(q) => setState({ q })}
/>;
```

Props that matter:

- `value`: the term the list currently shows results for (from the address). The field keeps its own text while you type and follows `value` when it changes from outside, such as the back button.
- `onSearch(term)`: called 400ms after the last keystroke, on Enter, or at once when cleared. `term` is trimmed, and `''` when the text is shorter than `minLength`.
- `label`: the accessible name. Required, since the placeholder is not a label.
- `pending`: `isPending` from `useListState`; the spinner stays until results land.
- `minLength` (2) and `maxLength` (200) match `MIN_SEARCH_LENGTH` and `MAX_SEARCH_LENGTH` in `@/lib/kit/lists/search`.

Behaviour: Escape clears the text (inside a dialog, the dialog closes instead), and the clear button (a ghost `IconButton` inside the box, with a "Clear search" tooltip) returns focus to the box. The box is 40px tall, the toolbar's first-row height.

Why 400ms: most people leave 150–300ms between keystrokes, so 400ms waits out a word and sends one query per pause instead of one per letter. It is 200ms sooner than the lists' old 600ms, and with the server render on top results still land within about a second of the last keystroke. The header search moves from 500ms to the same value.

Don't:

- Don't debounce by hand: `useDebounce(query, 500)` in `components/search/SearchCommandDialog.tsx`, `FILTER_APPLY_DELAY` (600ms) in `components/filters/useDeferredFilterApply.ts`.
- Don't search without a minimum or a spinner (the tournament list today), and don't make search wait for a button (admin player search in `app/admin/AdminDashboardClient.tsx`; a lookup by exact ID may keep a submit button, but it is then not a list search).
- Don't leave a list without search: the leaderboard needs a player search.
- Don't write a placeholder longer than about 30 characters; the box is about 290px wide on a phone and cuts it off. The beatmap list's "Search title, artist, difficulty, mapper, or ID" does; "Title, artist, mapper or ID" fits. The `label` carries the full name.

Gallery anchor: `/admin/design#lists-search-field`

## SortControl

A dropdown of sort keys plus a button that flips the direction. It reads and writes the same `SortState` as sortable table headers (`SortableHeader` in the tables family), so the toolbar and the table always agree.

```tsx
import {
  SortControl,
  type SortOption,
} from '@/components/kit/lists/SortControl';

const SORT_OPTIONS: SortOption<'endTime' | 'name'>[] = [
  {
    value: 'endTime',
    label: 'End date',
    defaultDirection: 'desc',
    directionLabels: { asc: 'Oldest first', desc: 'Newest first' },
  },
  {
    value: 'name',
    label: 'Name',
    defaultDirection: 'asc',
    directionLabels: { asc: 'A to Z', desc: 'Z to A' },
  },
];

<SortControl
  label="Sort tournaments by"
  options={SORT_OPTIONS}
  value={state.sort}
  onValueChange={(sort) => setState({ sort })}
/>;
```

Props that matter:

- `value`, `onValueChange`: `{ key, direction }`.
- `options`: `value`, `label`, and optionally `defaultDirection` (the direction a key starts in when picked; otherwise the current one is kept), `directionLabels` (plain words for the button's tooltip and name; otherwise "Ascending" and "Descending") and `group` (a divider between groups, like the beatmap list's counts and attributes).
- `label`: names the dropdown ("Sort tournaments by").

The direction button is an outline `IconButton` at `lg` (40px) named "Sort direction: Newest first", with the plain words in its tooltip.

Don't:

- Don't bake the direction into each option ("Newest", "Oldest") or offer only header clicks (`components/tournaments/TournamentMatchesAdminView.tsx`, `components/beatmaps/list/BeatmapSortableHead.tsx` alone).
- Don't leave a list unsorted when its rows have an order people care about (leaderboard, reports, audit).

Gallery anchor: `/admin/design#lists-sort-control`

## RulesetChips

Labelled chips that filter a list by any number of rulesets. "All" is selected when none is, and choosing it clears the selection.

```tsx
import { RulesetChips } from '@/components/kit/lists/RulesetChips';

<RulesetChips
  value={state.ruleset}
  onValueChange={(ruleset) => setState({ ruleset })}
/>;
```

- `value`: the chosen rulesets; `[]` means all. Pair it with `arrayParam(RATED_RULESETS, { role: 'scope' })`, so "Clear all" leaves it alone.
- `rulesets`: which chips to offer, defaulting to `RATED_RULESETS` (no `mania (other)`).
- `showAll`: hide the "All" chip.
- `label`: the group's accessible name, "Filter by ruleset" by default.

Gallery anchor: `/admin/design#lists-ruleset-chips`

## RulesetSwitch

The same chips as a single choice, for pages that show one ruleset at a time: the profile, stats and the leaderboard. It is a radio group, so arrow keys move between rulesets.

```tsx
import { RulesetSwitch } from '@/components/kit/lists/RulesetSwitch';

<RulesetSwitch
  value={state.ruleset}
  onValueChange={(ruleset) => setState({ ruleset })}
/>;
```

Pair it with `enumParam(RATED_RULESETS, { default: Ruleset.Osu, role: 'scope' })`.

Don't (for both ruleset controls):

- Don't use the other four ruleset pickers: bare round icons (`components/buttons/RulesetButton.tsx`, `components/buttons/RulesetSelector.tsx`), square toggles in a popover (`components/leaderboard/LeaderboardFilter.tsx`), full-width tabs (`components/stats/RatingDistributionTabs.tsx`) or a dropdown (`components/select/RulesetSelectContent.tsx`).
- Don't hide ruleset chips inside the filter panel on phones (`BeatmapListFilter.tsx` does); they wrap.
- Don't write ruleset labels by hand (`.replace('osu!', '')`); the chips use `getRulesetLabel`.

Gallery anchor: `/admin/design#lists-ruleset-switch`

## ScopeSwitch

A segmented control that picks whose rows a list shows, such as All / Friends. It sits on the toolbar's second row, before the ruleset chips.

```tsx
import { ScopeSwitch } from '@/components/kit/lists/ScopeSwitch';

<ScopeSwitch
  label="Players to show"
  value={state.friends ? 'friends' : 'all'}
  onValueChange={(scope) => setState({ friends: scope === 'friends' })}
  options={[
    { value: 'all', label: 'All' },
    {
      value: 'friends',
      label: 'Friends',
      disabled: !hasFriends,
      disabledReason: 'Sync your osu! friends in settings to rank them here.',
    },
  ]}
/>;
```

- An option with `disabled` and `disabledReason` gets an info button after the switch that says why, readable on tap.
- Keep the scope in the address with `booleanParam({ role: 'scope' })` or `enumParam([...], { role: 'scope' })`.

Don't:

- Don't use the grey `Tabs` bar with links (`app/leaderboard/LeaderboardTabs.tsx`) or hero tabs for a scope, and don't explain a disabled option in a hover-only tooltip.

Gallery anchor: `/admin/design#lists-scope-switch`

## ChoiceChip

One pill that toggles an option on or off (`aria-pressed`). `RulesetChips` and `ChoiceFilter` are built from it; use it alone only for a chip filter that is not a ruleset, such as "Lazer".

```tsx
import { ChoiceChip } from '@/components/kit/lists/ChoiceChip';

<ChoiceChip
  selected={state.lazer}
  onClick={() => setState({ lazer: !state.lazer })}
>
  Lazer
</ChoiceChip>;
```

- A selected chip gets a blue edge, a blue tint and a blue icon; the label stays `foreground`, because primary text is under 4.5:1 on light surfaces.
- `icon`: a 16px icon before the label. An icon that sets its own `text-*` colour keeps it when selected, so a `VerificationStatusGlyph` stays green or red; ruleset and plain lucide icons turn blue.
- `choiceChipClassName` is exported for radio items that need the same look (`RulesetSwitch` uses it).
- It is 32px tall, like the kit's `sm` buttons, but it is a toggle with a selected state, not an action, so it keeps its pill look instead of the kit `Button`'s.

Don't:

- Don't use `components/filters/FilterChip.tsx` (blue label text) in new code.
- Don't use a chip as a badge or a badge as a chip: a `Badge` never acts.

Gallery anchor: `/admin/design#lists-choice-chip`

## FilterPanel and FilterButton

The one filter panel: a labelled "Filters" button with the active count, opening a panel with a header strip (title and "Clear all") and the fields in a two-column grid. Fields apply as they change; there is no Apply button.

```tsx
import { FilterPanel } from '@/components/kit/lists/FilterPanel';

<FilterPanel
  title="Filter beatmaps"
  activeCount={list.activeFilterCount}
  onClearAll={list.clearFilters}
>
  <RangeFilter label="SR" min={0} max={15} step={0.1} … />
  <RangeFilter label="CS" span="half" … />
  <RangeFilter label="AR" span="half" … />
</FilterPanel>;
```

Props that matter:

- `title`: the panel's heading, "Filter tournaments".
- `activeCount`: `activeFilterCount` from `useListState`, the number of filter-role params that are set. Ruleset, scope, search and sort are visible in the toolbar and are not counted.
- `onClearAll`: `clearFilters` from `useListState`. It resets filter-role params only.
- `open`, `onOpenChange`: to control the popover.
- `FilterPanelContent` is the inside on its own, for a filter sidebar or the gallery.
- `FilterButton` (`@/components/kit/lists/FilterButton`) is the trigger: the kit `Button`, outline at `lg` (40px, beside the search field and sort), with a funnel, "Filters" and a solid primary count badge. Its accessible name is "Filters, 2 active". It passes other button props through, so it works as a `PopoverTrigger asChild` child.
- "Clear all" in the panel's header strip is a ghost `sm` Button, disabled while nothing is active.
- Opening the panel focuses the panel itself, named by its title, so a phone does not raise its keyboard for the first number box; Tab moves into the fields, and Escape closes it and returns focus to the button.

Do:

- Keep the panel's fields to filters. Search, sort and ruleset belong in the toolbar.
- Use `span="half"` for short numeric fields that pair up (CS and AR, OD and HP).

Don't:

- Don't use the legacy panels: `components/filters/FilterPopover.tsx` (with `FilterRangeField.tsx`, which truncates "Rank restriction", and native date inputs) and the leaderboard's own popover in `components/leaderboard/LeaderboardFilter.tsx` (Clear at the bottom, inputs under the slider).
- Don't let "Clear all" reset search, sort, ruleset or tab. Today the tournament list's Clear all resets all of them, and the beatmap list's active-filter row also empties the search and ruleset.
- Don't use an icon-only Filters button with a corner badge (the beatmap list today).

Gallery anchors: `/admin/design#lists-filter-button`, `/admin/design#lists-filter-panel`

## Filter fields

Each field is a `role="group"` named by its label. Labels wrap and never truncate. Every field takes `label`, `description` (one short line under the label), `info` (a longer explanation behind an info button), `span` (`full` or `half`) and `className`.

```tsx
import { DayRangeFilter } from '@/components/kit/lists/DayRangeFilter';
import {
  ChoiceFilter,
  FilterField,
  SwitchFilter,
} from '@/components/kit/lists/FilterPanel';
import { RangeFilter } from '@/components/kit/lists/RangeFilter';
import { CountrySearchSelect } from '@/components/leaderboard/CountryFilter';
import { tournamentRankScale } from '@/lib/filters/tournament-rank';

<RangeFilter
  label="Rank range"
  valueLabel="rank"
  min={1}
  max={1_000_000}
  scale={tournamentRankScale}
  value={state.rank}
  onValueChange={(rank) => setState({ rank })}
/>
<ChoiceFilter
  label="Verification status"
  options={VERIFICATION_STATUS_ORDER.map((status) => ({
    value: status,
    label: getVerificationStatusName(status),
    icon: <VerificationStatusGlyph status={status} className="size-4" />,
  }))}
  value={state.status}
  onValueChange={(status) => setState({ status })}
/>
<DayRangeFilter label="Dates" value={state.date} onValueChange={(date) => setState({ date })} />
<SwitchFilter label="Lazer only" checked={state.lazer} onCheckedChange={(lazer) => setState({ lazer })} />
<FilterField label="Country"><CountrySearchSelect … /></FilterField>
```

- `RangeFilter`: the number boxes always sit beside the label, with a two-thumb slider under them. Boxes show the number with separators (`1,000`), accept `1000` or `1,000`, and commit on Enter or blur; Escape reverts a box without closing the panel. The slider commits on release, so a drag is one navigation. A thumb at the end of the track, or an empty box ("Any"), means no limit. `min`, `max` and `integer` must match the page's `rangeParam`. `scale` takes a non-linear track (`tieredScale` from `@/lib/filters/scale`, `tournamentRankScale`); `format` is how screen readers hear a value (a duration, say); `valueLabel` is the noun in "Minimum rank".
- `ChoiceFilter`: chips that each switch one option on or off; nothing selected means no filter. Pair with `arrayParam`.
- `DayRangeFilter`: "From" and "Through" calendars, both ends inclusive, as `YYYY-MM-DD` UTC days. Pair with `dayRangeParam`.
- `SwitchFilter`: an on/off filter. Pair with `booleanParam`.
- `FilterField`: the same label, description and info layout around any other control.

Don't:

- Don't put a dropdown of checkboxes inside the panel for a handful of options (`MultiSelectDropdown` in `FilterPopover.tsx`); use `ChoiceFilter`. Keep dropdowns for long lists such as countries.
- Don't label with legacy names ("Team size", "Rank restriction", "Win rate %"); use the glossary in `@/lib/kit/format/fields`.

Gallery anchor: `/admin/design#lists-filter-panel`

## DateField and Calendar

A UTC day picked from a month calendar, replacing `<input type="date">`, which looks different in every browser and follows the visitor's locale.

```tsx
import { Calendar, DateField } from '@/components/kit/lists/DateField';

<DateField
  label="Start date"
  value={day}
  onValueChange={setDay}
  min="2007-01-01"
/>;
```

- `value`: `YYYY-MM-DD` or `undefined`. The button shows `Jul 20, 2024` (the format family's `formatDate`) or the placeholder ("Any date").
- `min`, `max`: the days that can be picked; the year list runs from 2007 (or `min`) to next year.
- `highlight`: tints the days between two ends, to show a range.
- The calendar opens on the selected day, or today in UTC. Arrow keys move by day and week, Page Up and Page Down by month (with Shift, by year), Home and End to the ends of the week. Month and year dropdowns jump further. "Clear" (a ghost `sm` Button) empties the field.
- The field is an outline `sm` Button (32px, the height of the filter panel's number boxes); the month arrows are `IconButton`s with "Previous month" and "Next month" tooltips. The day cells are grid cells with their own roving focus, not Buttons.
- `Calendar` is the grid on its own.

Gallery anchor: `/admin/design#lists-date-field`

## ActiveFilterChips

The row under the toolbar that names each active filter as a chip you can remove, with "Clear all" at the end. It shows the panel's filters only, and renders nothing when none is active.

```tsx
import { ActiveFilterChips } from '@/components/kit/lists/ActiveFilterChips';
import {
  formatChoiceFilterLabel,
  formatDayRangeFilterLabel,
  formatRangeFilterLabel,
} from '@/lib/kit/lists/filters';

<ActiveFilterChips
  onClearAll={list.clearFilters}
  filters={[
    {
      key: 'sr',
      label: formatRangeFilterLabel('SR', state.sr),
      onRemove: () => setState({ sr: {} }),
    },
    {
      key: 'status',
      label: formatChoiceFilterLabel(
        'Status',
        state.status.map(getVerificationStatusName)
      ),
      onRemove: () => setState({ status: [] }),
    },
    {
      key: 'date',
      label: formatDayRangeFilterLabel('Dates', state.date),
      onRemove: () => setState({ date: {} }),
    },
  ]}
/>;
```

- A filter whose `label` is empty is left out, so pass every filter and let the helpers return `''` for inactive ones.
- Label helpers: `formatRangeFilterLabel` (`SR: 5 – 7`, `Rank range: at least 1,000`, `BPM: at most 180`), `formatChoiceFilterLabel` (`Status: Pending, Verified +1`), `formatDayRangeFilterLabel` (`Dates: Jul 20 – Aug 3, 2024`, `Dates: from Jul 20, 2024`).
- Each chip is named "Remove filter: SR: 5 – 7". Long labels wrap inside the chip.
- Chips are at least 32px tall, the height of the ghost `sm` "Clear all" Button after them and of the ruleset chips above.

Don't:

- Don't truncate chip labels (`truncate` in `TournamentListFilter.tsx`), write `SR: 5 – Any`, or show raw dates (`2024-07-20`).

Gallery anchor: `/admin/design#lists-active-filter-chips`

## useListState and list params

The list's state, read from and written to the page address. One spec drives the server page, the client hook, pagination links and "See all" links.

```ts
import {
  clearListFilters,
  countActiveFilters,
  getDefaultListState,
  listStateHref,
  parseListState,
  serializeListState,
} from '@/lib/kit/lists/params';
import { useListState } from '@/lib/kit/lists/use-list-state';
```

Param builders (each takes an optional `key` to override the URL key, and `role`):

| Builder                              | Value                            | Address                                  | Default role |
| ------------------------------------ | -------------------------------- | ---------------------------------------- | ------------ |
| `searchParam({ minLength })`         | `string`, trimmed                | `q=world+cup`                            | `search`     |
| `pageParam()`                        | `number`, from 1                 | `page=3`                                 | `page`       |
| `sortParam(keys, default)`           | `SortState`                      | `sort=name&dir=asc`                      | `sort`       |
| `enumParam(options, { default })`    | one option, or `undefined`       | `ruleset=1`                              | `filter`     |
| `arrayParam(options)`                | options in their fixed order     | `status=0&status=4`                      | `filter`     |
| `booleanParam({ default })`          | `boolean`                        | `lazer=true`                             | `filter`     |
| `numberParam({ min, max, integer })` | `number \| undefined`            | `report=42`                              | `filter`     |
| `rangeParam({ min, max, integer })`  | `{ min?, max? }`                 | `minSr=5&maxSr=7` for a param named `sr` | `filter`     |
| `dayRangeParam()`                    | `{ from?, to? }` as `YYYY-MM-DD` | `dateFrom=2024-07-20` for `date`         | `filter`     |

Roles decide how the list treats a param:

- `filter`: counted on the Filters button, shown as an active-filter chip, reset by "Clear all".
- `scope`: a visible switch (ruleset chips, All / Friends, a tab). "Clear all" leaves it alone.
- `search`, `sort`: never cleared with filters.
- `page`: back to page 1 whenever anything else changes (`applyListPatch`).

What the codecs guarantee, and the tests check:

- Defaults are never written, so a fresh list has a bare address; a sort writes only the half that differs (`dir=asc` alone).
- Invalid values read as the default instead of throwing: unknown options, out-of-range numbers, `1e3` or `0x10`, `2024-02-30`, a page of 0.
- Arrays repeat the key, drop duplicates and unknown values, and keep the options' order, so one state has one address.
- Ranges drop bounds outside the domain, treat a bound at the domain's edge as no limit, and swap reversed bounds; day ranges do the same.
- `serializeListState` keeps params the spec does not own (`tab`, tracking params) ahead of its own, and output order follows the spec.
- `defineListParams` throws when two params claim one URL key.
- `sortParam(…, { legacyDescendingKey: 'descending' })` still reads old `descending=true|false` links, and never writes them.

`useListState(params)` returns:

- `state`: the address, plus any change still navigating (React's `useOptimistic`), so controls update at once.
- `setState(patch, { history })`: merges and navigates without scrolling; `history: 'replace'` overwrites the current entry instead of adding one. `undefined` in a patch resets that param to its default.
- `clearFilters()`, `activeFilterCount`, `isPending` (pass it to `SearchField`), and `hrefFor(patch)` for links within this list, such as pagination.

A link that opens another list already filtered, such as the header search's "See all", builds the address from that list's spec, so it stays valid when the list's params change:

```ts
listStateHref('/tournaments', TOURNAMENT_LIST_PARAMS, {
  ...getDefaultListState(TOURNAMENT_LIST_PARAMS),
  q: term,
});
// '/tournaments?q=world+cup'
```

Do:

- Keep every list control in the spec: the audit filters, the admin report status, the tournament match sort, the stats tab and the filter-report ID reset on reload today.
- Keep a device preference, such as the beatmap list's card or table layout, in `localStorage`, not the address.
- Use `formatCountOf` for the toolbar's result count.

Don't:

- Don't hand-roll URL building: `buildBeatmapSearchParams` in `lib/beatmaps/list-params.ts`, `createSearchParamsFromSchema` in `lib/utils/leaderboard.ts`, `setFlattenedParams` in `lib/utils/urlParams.ts` and `submitValues` in `TournamentListFilter.tsx` move onto the spec.
- Don't keep list state in `useState`: `components/audit/AuditEventFeed.tsx`, `app/admin/reports/AdminReportsClient.tsx`, `components/tournaments/TournamentMatchesAdminView.tsx`.
- Don't create the spec inside a component; it must be a stable module-level value.

Gallery anchor: `/admin/design#lists-list-state`

## Sort state

`@/lib/kit/lists/sort` holds the one sort shape, shared by `SortControl`, `sortParam` and sortable table headers.

```ts
import {
  type SortState,
  fromDescending,
  getAriaSort,
  toDescending,
  toggleSort,
} from '@/lib/kit/lists/sort';

const sort: SortState<'rating' | 'name'> = { key: 'rating', direction: 'desc' };
toggleSort(sort, 'rating'); // { key: 'rating', direction: 'asc' }
toggleSort(sort, 'name', 'asc'); // { key: 'name', direction: 'asc' }
toDescending(sort); // { sort: 'rating', descending: true }, for the API
getAriaSort(sort, 'rating'); // 'descending'
```

- Keys can be strings or numeric enum members (`TournamentQuerySortType`).
- `SORT_DIRECTION_LABELS`, `flipSortDirection`, `isSortDirection` and `sortStatesEqual` cover the rest.

Gallery anchor: `/admin/design#lists-sort-control`
