# Tables, rows and paging

How the site shows tabular data: one table style, sortable headers, which rows open as a whole, rows on phones, and paging.
Every value comes from the beatmap tables, which are the reference. Components live in their own files under `@/components/kit/tables/`; the pure helpers, with unit tests, under `@/lib/kit/tables/`.

- [Rules at a glance](#rules-at-a-glance)
- [DataTable](#datatable): the one table style, with `DataTableHeader`, `DataTableBody`, `DataTableRow`, `DataTableHead` and `DataTableCell`
- [Sticky header](#sticky-header): `stickyHeader` for long tables
- [SortableHeader](#sortableheader): a column header that sorts
- [Sorting rows](#sorting-rows): `sortRows` for a list you hold in full; the sort state itself is the lists family's
- [Row behaviour](#row-behaviour): which rows link, which open as a whole, which get the hover tint
- [EntityLink](#entitylink): the name as a link, avatar or cover inside it
- [DataTableLinkRow and DataTableLinkCell](#datatablelinkrow-and-datatablelinkcell): a table row that opens as a whole
- [ViewButton](#viewbutton): the labelled "View" button that opens a report in a modal
- [PhoneRowList and PhoneRow](#phonerowlist-and-phonerow): what a table becomes below tablet width
- [PaginationFooter](#paginationfooter): numbered pages in the panel footer
- [LoadMore](#loadmore): "Load more" for activity feeds
- [MissingValue](#missingvalue): the muted em dash
- [Pagination helpers](#pagination-helpers): `getPageItems`, `formatPageReadout` and friends

## Rules at a glance

| Rule             | Do                                                                                   | Instead of                                             |
| ---------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Headers          | 12px muted, sentence case, on a `bg-muted` strip, 32px tall                          | bold white headers (`font-semibold text-foreground`)   |
| Numbers          | right-aligned, tabular figures, separators on counts (`formatCount`)                 | centred numbers, bare `{count}`                        |
| Missing values   | a muted em dash, read as "No value"                                                  | `0`, `N/A`, an empty cell, `Unknown`                   |
| Rows             | divided rows, no stripes                                                             | zebra stripes (`index % 2`)                            |
| Frame            | the table runs edge to edge inside its Panel, first and last cell 16px in            | a second `rounded-lg border` box around the table      |
| Links            | the name links, avatar or cover inside the same link, one link per destination       | a separate avatar link, a whole-row link on a new list |
| Hover tint       | only on rows that open as a whole                                                    | a tint on rows where only the name links               |
| Report rows      | a labelled "View" button opens the modal                                             | an eye icon, a clickable row                           |
| Phones           | below tablet width the table becomes PhoneRows; nothing scrolls sideways             | a sideways-scrolling table, a forced `min-w-[44rem]`   |
| Searchable lists | numbered pages in the panel footer with "1–50 of 8,412"                              | pages under the panel, infinite scroll, a silent cap   |
| Activity feeds   | LoadMore                                                                             | "Show more (36 more)", numbered pages                  |
| Sorting          | sortable headers and the toolbar's sort control share one `{ key, direction }` state | a header sort that disagrees with the dropdown         |

## DataTable

The one table style, built on `components/ui/table.tsx`: muted 12px headers on a tinted strip, right-aligned numbers, divided rows with no stripes, running edge to edge inside a Panel under its SectionHeader or toolbar.

```tsx
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/kit/tables/DataTable';
import { EntityLink } from '@/components/kit/tables/EntityLink';
import { formatCount, formatRank, formatRating } from '@/lib/kit/format/number';

<Panel>
  <SectionHeader icon={ListOrdered} title="Leaderboard" meta="8,412 players" />
  <DataTable aria-label="Leaderboard" phoneRows={phoneRows}>
    <DataTableHeader>
      <DataTableRow>
        <DataTableHead className="w-16">Rank</DataTableHead>
        <DataTableHead>Player</DataTableHead>
        <DataTableHead numeric>Rating</DataTableHead>
        <DataTableHead numeric showFrom="lg">Matches</DataTableHead>
      </DataTableRow>
    </DataTableHeader>
    <DataTableBody>
      {rows.map((row) => (
        <DataTableRow key={row.player.id} highlight={row.player.id === viewerId}>
          <DataTableCell className="font-medium tabular-nums">{formatRank(row.rank)}</DataTableCell>
          <DataTableCell>
            <EntityLink href={`/players/${row.player.id}`} leading={<OsuAvatar osuId={row.player.osuId} size={24} />}>
              {row.player.username}
            </EntityLink>
          </DataTableCell>
          <DataTableCell numeric>{formatRating(row.rating)}</DataTableCell>
          <DataTableCell numeric showFrom="lg">{formatCount(row.matches)}</DataTableCell>
        </DataTableRow>
      ))}
    </DataTableBody>
  </DataTable>
  <PaginationFooter … />
</Panel>;
```

Props that matter:

- DataTable: `aria-label` (or `aria-labelledby` on the SectionHeader title) names the table. `phoneRows` takes a PhoneRowList and shows it instead of the table below tablet width (768px); `null` keeps the table at every width. `fixed` switches to a fixed layout so columns keep their widths and long names truncate. `stickyHeader`, see below. `className` goes to the `<table>`, `containerClassName` to its wrapper.
- DataTableHead and DataTableCell: `numeric` right-aligns with tabular figures; `align="end"` right-aligns anything else (a date, an action). `showFrom` (`sm`, `md`, `lg`, `xl`) hides a column below that width; give the header and its cells the same value, ideally from one `COLUMN` map as `components/beatmaps/list/BeatmapListTable.tsx` does. `info` on a header adds an InfoButton beside the label.
- DataTableCell: `muted` makes a secondary column 12px muted (dates, formats, accuracy). A cell whose content is `null`, `undefined`, `false`, blank or the formatters' `—` shows MissingValue; pass `empty={false}` for marker, selection and action columns that are meant to be blank.
- DataTableRow: no hover tint, ever. `highlight` tints the signed-in player's own row; also say so in words (a "You" badge).

Do:

- Put the table straight inside the Panel, after the SectionHeader or the toolbar strip. The first and last cells line up with the panel's 16px padding on their own; don't add `pl-4` or `pr-4`.
- Format every number before it reaches a cell: `formatCount`, `formatRank`, `formatRating`, `formatPercent`, `formatAccuracy` from `@/lib/kit/format/number`, dates through `DateText` or `DateRangeText`.
- Hide less important columns with `showFrom` so the table fits at tablet width, and give phones `phoneRows`.
- Keep the first and last columns visible at every width; the 16px edge padding goes to whichever cell is first and last in the markup.
- Render `EmptyState` (`@/components/kit/feedback/EmptyState`) in place of the table when there are no rows, never an empty table, straight under the panel's SectionHeader or ListToolbar; pass `clearFilters` when filters emptied it. Size it by its container as [feedback.md](feedback.md#choosing-a-state) says: the regular size when the table is the panel's main content (a list page, a section of a profile or tournament page), `size="compact"` for a table in a small panel in a grid or in a dialog. A failed request is `SectionError` (`@/components/error/SectionError`, `size="compact"` in the same places), and loading is `TableSkeleton` with `phoneRows={<PhoneRowListSkeleton />}` from `@/components/kit/feedback/Skeletons`.

Don't:

- Don't wrap a table in a second frame (`overflow-x-auto rounded-lg border`): `app/leaderboard/data-table.tsx`, `app/reports/MyReportsClient.tsx`, `app/admin/reports/AdminReportsClient.tsx`, `components/tournaments/TournamentRatingsView.tsx`, `components/filtering/FilteringResultsTable.tsx`, `components/matches/MatchStatsView.tsx`.
- Don't stripe rows (`index % 2 === 0 ? 'bg-background/50' : 'bg-muted/10'` in `app/leaderboard/data-table.tsx`, `TournamentRatingsView.tsx`, `FilteringResultsTable.tsx`).
- Don't bold or whiten headers (`className="font-semibold text-foreground"` on `TableHead` in `app/leaderboard/data-table.tsx`) or centre numbers (`text-center` throughout `app/leaderboard/columns.tsx`, `components/matches/MatchStatsView.tsx`, `MatchStatsPlayerRow.tsx`, `components/player/PlayerTournamentMatchTable.tsx`).
- Don't print `#${rank}`, `{count}` or `rating.toFixed(0)` (`app/leaderboard/columns.tsx`); use the number helpers.
- Don't import `@/components/ui/table` in a page. It stays as the primitive this is built on; `Eyebrow` inside a `TableHead` with `h-8` by hand (the beatmap tables today) is what DataTableHead now does for you.

Gallery anchors: `/admin/design#tables-data-table`, `/admin/design#tables-missing-value`

## Sticky header

Long tables keep their header row in view.

```tsx
<DataTable stickyHeader>…</DataTable>                 // under the site header, from tablet width
<div tabIndex={0} className="max-h-[60vh] overflow-y-auto">
  <DataTable stickyHeader="scroll-area">…</DataTable>  // inside a scrolling box, such as a dialog body
</div>
```

- `stickyHeader` (or `"page"`) pins the header under the site header from `md` up, using `stickyTableHeader` from `@/lib/utils/table`. The table can then no longer scroll sideways, so it must fit: hide columns with `showFrom`.
- `"scroll-area"` pins it to the top of the nearest scrolling box (`stickyTableHeaderInScrollArea`), as the beatmap pools dialog does. Make that box focusable (`tabIndex={0}` with a focus ring) so it scrolls by keyboard.
- The header strip is opaque (`bg-muted`), so rows never show through it.

Use it on tables longer than about one screen: the leaderboard, a tournament's ratings, the beatmap list, a pool. Short tables don't need it.

Gallery anchor: `/admin/design#tables-sticky-header`

## SortableHeader

A column header that sorts the table. It reads and writes the same `{ key, direction }` state as the list toolbar's sort control (lists family), so the header arrow and the dropdown always show the same choice.

```tsx
import { SortableHeader } from '@/components/kit/tables/SortableHeader';
import type { SortState } from '@/lib/kit/lists/sort';

// A list sorted in component state, such as a pool the page holds in full.
const [sort, setSort] = useState<SortState<'rating' | 'matches' | 'name'>>({
  key: 'rating',
  direction: 'desc',
});

<SortableHeader sortKey="rating" sort={sort} onSortChange={setSort} numeric>
  Rating
</SortableHeader>
<SortableHeader sortKey="name" sort={sort} onSortChange={setSort} defaultDirection="asc">
  Player
</SortableHeader>

// A list sorted in the address, from the server page, with the list's
// `defineListParams` spec (lists family). Page 1 is the default, so it drops out of the URL.
<SortableHeader
  sortKey="matches"
  sort={state.sort}
  getSortHref={(sort) =>
    listStateHref('/tournaments', TOURNAMENT_LIST_PARAMS, { ...state, sort, page: 1 })
  }
  numeric
>
  Matches
</SortableHeader>

// The same from a client component: `useListState`'s `hrefFor` resets the page for you.
<SortableHeader sortKey="matches" sort={list.state.sort} getSortHref={(sort) => list.hrefFor({ sort })} numeric>
  Matches
</SortableHeader>
```

Props that matter:

- `sortKey`, `sort`: this column's key and the list's current sort. The key type comes from `sort`.
- Exactly one of `onSortChange(next)`, for a list sorted in state, or `getSortHref(next)`, for a list sorted in the address. `getSortHref` renders a link, so it works in a server component and survives a reload; send the list back to page 1 in it.
- `defaultDirection`: the first direction when the column is chosen; descending unless the column reads better A to Z (names).
- `numeric` or `align="end"` for right-aligned columns: the arrow then leads, so the label lines up with the numbers. `showFrom` and `info` work as on DataTableHead.

The sorted column's label and arrow turn `text-foreground` and the `th` gets `aria-sort`; other columns show a muted double arrow. Clicking the sorted column flips it.

Do:

- Show both: the toolbar's `SortControl` and sortable headers on the table view, wired to the same `SortState` (finding 24). With `useListState`, both read `state.sort`; the control calls `setState({ sort })` and the headers link to `hrefFor({ sort })`.
- Sort on the server for paged lists; use `sortRows` only for a list you hold in full.

Don't:

- Don't build a sort header by hand: `components/beatmaps/list/BeatmapSortableHead.tsx`, the sort buttons in `components/matches/MatchStatsView.tsx` and the local `SortableHeader` in `components/filtering/FilteringResultsTable.tsx` all become this component.
- Don't bake the direction into dropdown options ("Newest first") while headers flip a separate flag.
- Don't put an InfoButton inside the header's button; use `info`, which places it beside.

Gallery anchor: `/admin/design#tables-sortable-header`

## Sorting rows

The sort state is the lists family's: `SortState<K>` (`{ key, direction }`), `toggleSort`, `getAriaSort`, `fromDescending` and `toDescending` live in `@/lib/kit/lists/sort`, and `sortParam` keeps a sort in the address. SortableHeader and SortControl both use it; never define another sort shape. This family adds one helper for lists you hold in full.

```ts
import { sortRows } from '@/lib/kit/tables/sort';

// `sort` is the SortState that SortControl and the SortableHeaders share.
const sorted = sortRows(pool, sort, {
  sr: (map) => map.sr,
  title: (map) => map.title,
  games: (map) => map.gameCount,
});
```

- Every key of the sort state needs an accessor; a key without one leaves the rows in their order.
- `sortRows` returns a new array, keeps ties in their order, sorts names case-insensitively with numbers in order (`player9` before `player10`, fixed `en-US`, so server and browser agree), and puts missing values (`null`, `undefined`, `NaN`, an invalid date) last in both directions.
- Sort on the server for a list the server pages; `sortRows` would only order the current page.
- The API and old URLs keep their `sort` and `descending` parameters; convert at the edge with `fromDescending` and `toDescending`.

Gallery anchor: `/admin/design#tables-sortable-header`

## Row behaviour

Owner decision (finding 28, 15 Oct): no new whole-row links or row dialogs.

| Row                                                                           | Behaviour                                                                                | Tint |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---- |
| Beatmap list (all three views), tournament list, pooled beatmaps              | the whole row opens the entity (`DataTableLinkRow`, `PhoneRow href`, `RowListItem href`) | yes  |
| Home cards and search results                                                 | the whole card or result opens the entity                                                | yes  |
| Profile tournament cards, audit rows                                          | expand in place                                                                          | no   |
| Leaderboard, filter results, match lists, tournament matches, everything else | only the name links (`EntityLink`), secondary links stay inline                          | no   |
| My reports, admin reports                                                     | a labelled "View" button opens the modal; the entity link works on its own               | no   |

The hover tint is `ROW_HOVER_TINT` from `@/lib/kit/tables/row`: `hover:bg-muted/40`, `dark:hover:bg-secondary/70`, the same tint RowList and the tournament list use. A tint promises that a click anywhere on the row goes somewhere. `ROW_TITLE_HOVER` goes beside it and turns the name marked `data-row-title` blue while the row is hovered; DataTableLinkRow and a PhoneRow with `href` apply both for you.

Don't:

- Don't tint rows where only the name links: `hover:bg-muted/25` on `components/beatmap/BeatmapLeaderboardCard.tsx` and `BeatmapPoolsDialog.tsx` rows, `hover:bg-muted/50` in `components/tournaments/MatchLedgerRow.tsx` and `components/matches/MatchStatsPlayerRow.tsx`, `hover:bg-muted/30` in `components/player/PlayerTournamentMatchTable.tsx`, `hover:bg-muted` in `components/player/PlayerRatingChartTable.tsx`.
- Don't make a row clickable with `onClick` (My reports today) or add a new whole-row link.

Gallery anchors: `/admin/design#tables-data-table` (name links, no tint), `/admin/design#tables-link-row` (opens as a whole, tint)

## EntityLink

An entity's name as a link, with its avatar or cover inside the same link, so each row has one link per destination. It takes the size of the surrounding text, is `font-medium`, turns blue on hover and truncates a long name.

```tsx
import { EntityLink } from '@/components/kit/tables/EntityLink';

<EntityLink href={`/players/${player.id}`} leading={<OsuAvatar osuId={player.osuId} username={player.username} size={24} />}>
  {player.username}
</EntityLink>
<CountryFlag country={player.country} />

<EntityLink href={`/tournaments/${tournament.id}`}>{tournament.name}</EntityLink>
```

Props that matter:

- `href`, `children` (the name).
- `leading`: the avatar (24px in tables, 32px in rows), cover or logo. It is `aria-hidden`; the name alone names the link.
- `prefetch`: off by default, because a long list would prefetch every row.
- `title`: pass the full name when it may truncate.

Do:

- Put a flag, status icon or badge after the link, outside it.
- Keep secondary links (country, tournament) as their own inline links.

Don't:

- Don't link the avatar and the name separately, or leave the avatar out of the link (`app/leaderboard/columns.tsx` and `components/filtering/FilteringResultsTable.tsx` link only the name today).
- Don't colour names `text-primary` at rest (`app/admin/reports/AdminReportsClient.tsx` entity links).
- Don't use it inside a row that opens as a whole; links can't nest. Mark the plain name with `data-row-title` there.

Gallery anchor: `/admin/design#tables-entity-link`

## DataTableLinkRow and DataTableLinkCell

A table row that opens as a whole, with the hover tint. Only for tables whose rows already open as a whole: the beatmap list's table view and a tournament's pooled beatmaps.

```tsx
import {
  DataTableLinkCell,
  DataTableLinkRow,
} from '@/components/kit/tables/DataTableLinkRow';

<DataTableLinkRow key={map.id}>
  <DataTableLinkCell
    href={`/beatmaps/${map.osuId}`}
    label={`View ${map.artist} - ${map.title} [${map.diffName}]`}
  >
    <span data-row-title>{map.title}</span> …
  </DataTableLinkCell>
  <DataTableCell numeric>{formatCount(map.gameCount)}</DataTableCell>
</DataTableLinkRow>;
```

- DataTableLinkCell holds the row's one real link, an overlay over the cell, so the name, cover and details stay plain text. `label` is the link's accessible name; always set it.
- A click anywhere else on the row follows that link (cmd, ctrl, shift or middle click opens a new tab). Clicks on a button, input or link inside the row keep their own behaviour, and so does selecting text.
- Mark the name with `data-row-title`; it turns blue while the row is hovered.
- A control inside the link cell (an audio preview, a checkbox) needs `relative z-20` to sit above the overlay.
- Below tablet width, give the DataTable `phoneRows` of `PhoneRow`s with `href` and `linkLabel`, the slot or rank as `rank` and the key number as `value`; a fixed table squeezed to a phone truncates every name.
- Client component (the row listens for clicks).

Don't:

- Don't use it to add a whole-row link to a table that doesn't open as a whole today.
- Don't put a second link to the same entity in the row.

Gallery anchor: `/admin/design#tables-link-row`

## ViewButton

The labelled "View" button that opens a row's record in a modal. Admin reports and My reports both use it; neither row is clickable as a whole, and the entity link in the row keeps working on its own.

```tsx
import { DialogTemplate } from '@/components/kit/controls/DialogTemplate';
import { ViewButton } from '@/components/kit/tables/ViewButton';

// One dialog per row, opened by its trigger (preferred). Radix mounts the
// content only while it is open, so a long table costs nothing.
<DataTableCell align="end">
  <DialogTemplate
    trigger={<ViewButton subject={`report ${formatId(report.id)}`} />}
    title={`Report ${formatId(report.id)}`}
    description={<Timestamp date={report.created} />}
  >
    <ReportDetails report={report} />
  </DialogTemplate>
</DataTableCell>;
```

- `subject` completes the accessible name: "View report 1204". The visible label is always "View".
- It is the controls family's `Button` (`@/components/kit/controls/Button`), outline at `sm` (32px), with `aria-haspopup="dialog"`; all other button props pass through, including `pending` and `disabled`. While its dialog is open it keeps the outline's open fill.
- Put it in the last column, right-aligned, with a header of `<span className="sr-only">Actions</span>`. On phones it is the PhoneRow's `value`.
- The record opens in `DialogTemplate` (`@/components/kit/controls/DialogTemplate`), the one dialog layout, never a hand-built `DialogContent` with a centred header.
- As the dialog's trigger it gets focus back when the dialog closes. A page that keeps one shared `DialogTemplate` opened from `onClick` instead gets the same, because DialogTemplate returns focus to whatever had it when the dialog opened; keep the report in state until the close animation ends so the dialog doesn't empty as it fades.

Don't:

- Don't use an icon-only eye button (`Eye` in `app/admin/reports/AdminReportsClient.tsx`) or open the dialog from a row click (`onClick` on `TableRow` in `app/reports/MyReportsClient.tsx`).
- Don't wrap `Dialog` in a tooltip; wrap `DialogTrigger` if you need one.

Gallery anchor: `/admin/design#tables-view-button`

## PhoneRowList and PhoneRow

What a table becomes below tablet width (finding 34): one row per record that keeps the key number visible and never scrolls sideways. Modelled on the phone leaderboard: rank, avatar, name with flag, one muted line, and on the right the tier icon 4px left of the rating.

```tsx
import { PhoneRow, PhoneRowList } from '@/components/kit/tables/PhoneRow';

<DataTable
  aria-label="Leaderboard"
  phoneRows={
    <PhoneRowList as="ol" aria-label="Leaderboard">
      {rows.map((row) => (
        <PhoneRow
          key={row.player.id}
          rank={formatRank(row.rank)}
          title={
            <>
              <EntityLink
                href={`/players/${row.player.id}`}
                leading={<OsuAvatar osuId={row.player.osuId} size={24} />}
              >
                {row.player.username}
              </EntityLink>
              <CountryFlag country={row.player.country} />
            </>
          }
          description={`${formatCountOf(row.tournaments, 'tournament')} · ${formatPercent(row.winRate)} win rate`}
          valueAdornment={
            <TapTooltip
              content={tierName}
              triggerAriaLabel={`Tier: ${tierName}`}
              triggerClassName="w-auto rounded-full"
            >
              <TierIcon
                tier={tier}
                subTier={subTier}
                width={22}
                height={22}
                className="block"
              />
            </TapTooltip>
          }
          value={formatRating(row.rating)}
        />
      ))}
    </PhoneRowList>
  }
>
  …
</DataTable>;
```

Props that matter:

- PhoneRowList: `as="ol"` when the order means something; `aria-label`. Its rows share columns (CSS subgrid), so ranks, names and values line up from row to row.
- PhoneRow: `rank` (formatted), `title` (an EntityLink, then a flag, status icon or badge), `description` (one muted 12px line with what the hidden columns said, joined with `·`), `value` (the number the table is about), `valueAdornment` (4px left of the value, such as the tier icon at 20–24px wrapped in `TapTooltip` so its name opens on tap), `valueDescription` (a muted line under the value, such as a RatingDelta), `highlight`.
- `href` and `linkLabel`: the whole row becomes one link with the hover tint. Only for lists whose rows open as a whole (beatmap list, tournament list, pooled beatmaps); `title` is then plain text marked `data-row-title`.
- A missing `value` shows MissingValue.

Do:

- Pick the one number people scan for (rating, score, status, matches) as `value`; everything else goes into `description` or is dropped.
- Leave a missing part out of `description` rather than printing a dash in the middle of it.

Don't:

- Don't let a table scroll sideways on a phone: `minWidthClassName="min-w-[44rem]"` on the pool in `components/tournaments/TournamentBeatmapsAdminView.tsx` (even for visitors), the leaderboard's off-screen rating column, tournament ratings and the audit pages do today.
- Don't hand-build phone lists per page (`<ol className="divide-y sm:hidden">` in `components/beatmap/BeatmapLeaderboardCard.tsx` and `BeatmapPoolsDialog.tsx`, the `lg:table-row` trick in `components/matches/MatchStatsPlayerRow.tsx`).
- Don't drop the tier icon on phones; drop the tier name.

Gallery anchor: `/admin/design#tables-phone-rows`

## PaginationFooter

Numbered pages inside the panel's footer with a "1–50 of 8,412" readout, for every searchable or filterable list (finding 25). It renders nothing when everything fits on one page.

```tsx
import { PaginationFooter } from '@/components/kit/tables/PaginationFooter';
import { listStateHref, parseListState } from '@/lib/kit/lists/params';

// Paged in the address (server page). The page comes from the list's spec, `page: pageParam()`.
const state = parseListState(LEADERBOARD_LIST_PARAMS, await searchParams);
const data = await orpc.leaderboard.list(toApiFilter(state)); // toApiFilter: the page's own mapping

<PaginationFooter
  page={state.page}
  pageSize={50}
  totalCount={data.totalCount}
  getPageHref={(page) => listStateHref('/leaderboard', LEADERBOARD_LIST_PARAMS, { ...state, page })}
  label="Leaderboard pages"
/>

// From a client component with useListState:
<PaginationFooter … getPageHref={(page) => list.hrefFor({ page })} />

// Paged in component state, such as rows a dialog already holds:
<PaginationFooter page={page} pageSize={25} totalCount={reports.length} onPageChange={setPage} />
```

Props that matter:

- `page` (1-based, clamped), `pageSize`, `totalCount` (every matching row, not just this page).
- Exactly one of `getPageHref(page)`, which renders links (preferred: the page survives a reload and can be shared, finding 26), or `onPageChange(page)`, which renders buttons.
- `label`: the navigation's accessible name.
- `siblings`: pages on each side of the current one (1).

Layout: the readout on the left, the page links on the right: Previous, the first page, a gap, the current page with its neighbours, a gap, the last page, Next. The number of links stays the same on every page, so nothing jumps. In a footer narrower than 36rem (phones, side panels) it keeps only the arrows around "3 / 169". The current page is the outline button with `aria-current="page"`; Previous on the first page and Next on the last are disabled, not dead links.

The controls are the controls family's, at `sm` (32px): each page is a kit `Button` (`ghost`, with its hover fill; the current page `outline`) drawn on the `Link` with `asChild`, and Previous and Next are labelled ghost Buttons in a wide footer and `IconButton`s in a narrow one, so the bare arrows still have a "Previous page" or "Next page" tooltip.

Do:

- Place it as the last child of the Panel, right after the table or rows.
- Keep the page in the list's params spec (`pageParam()` in `@/lib/kit/lists/params`); it goes back to 1 whenever search, sort or a filter changes.
- Redirect an out-of-range `?page=` to the last page, as `app/beatmaps/page.tsx` does.

Don't:

- Don't page under the panel (`app/leaderboard/page.tsx`) or hand-build pagers (`BeatmapPagination` in `app/beatmaps/page.tsx`, `renderPageNumbers` in `app/leaderboard/page.tsx`).
- Don't scroll a searchable list forever (`components/tournaments/list/TournamentList.tsx`).
- Don't silently cap a list: `pageSize: 100` in `app/admin/reports/AdminReportsClient.tsx` drops everything after the first hundred without saying so.

Gallery anchor: `/admin/design#tables-pagination`

## LoadMore

The footer of an activity feed: how many entries are showing and a "Load more" button that appends the next batch, then a note once everything is showing. Only for feeds (the audit log, a player's recent activity); searchable lists use PaginationFooter.

```tsx
import { LoadMore } from '@/components/kit/tables/LoadMore';

<LoadMore
  onLoadMore={() => setSize(size + 1)}
  hasMore={hasMore}
  loading={isValidating}
  shownCount={events.length}
  totalCount={total}
/>;
```

- Readout: "Showing 50 of 1,214", "Showing 50" when the total is unknown, "Showing all 214" at the end.
- `loading` disables the button and shows a spinner (the kit Button's `pending`, an outline `sm` Button); the label stays "Load more".
- It announces the new count politely to screen readers.
- A failed batch keeps the loaded rows and shows `SectionError` (`@/components/error/SectionError`) at `size="inline"` in a `border-t px-4 py-4` strip under them, with "Try again", not a custom row.

Don't:

- Don't write "Show more (36 more)" (`components/player/PlayerTournamentsList.tsx`, `components/player/PlayerBeatmapsList.tsx`); those lists are not feeds, so they page or show in full.
- Don't hand-build the button (`components/audit/AuditEventFeed.tsx`).

Gallery anchor: `/admin/design#tables-load-more`

## MissingValue

A muted em dash for a missing value, read by screen readers as "No value". DataTableCell and PhoneRow render it on their own; use it directly in tiles, hero rows and anywhere else one value can be missing.

```tsx
import { MissingValue } from '@/components/kit/tables/MissingValue';

<MissingValue />
<MissingValue label="No peak rating yet" />
```

- `label`: what a screen reader says instead of the dash.
- The format helpers print the same dash (`EMPTY_VALUE`) as plain text; inside a cell it is recognised and muted.

Don't:

- Don't write `'—'` or `'N/A'` by hand (`components/beatmap/BeatmapLeaderboardCard.tsx`, `BeatmapPoolsDialog.tsx`), and don't show `0` for a value that doesn't exist.

Gallery anchor: `/admin/design#tables-missing-value`

## Pagination helpers

Plain functions in `@/lib/kit/tables/pagination`, for pages that build their own paging logic or need the readout elsewhere.

```ts
import {
  clampPage,
  formatLoadedReadout,
  formatPageReadout,
  getPageItems,
  getPageRange,
  getTotalPages,
} from '@/lib/kit/tables/pagination';

getTotalPages(8412, 50); // 169; at least 1
clampPage(400, 169); // 169
getPageRange(2, 50, 8412); // { start: 51, end: 100 }
formatPageReadout(1, 50, 8412); // "1–50 of 8,412"
formatPageReadout(1, 50, 0); // "No results"
getPageItems(84, 169); // [1, 'start-ellipsis', 83, 84, 85, 'end-ellipsis', 169]
formatLoadedReadout(50, 1214); // "50 of 1,214"
```

- The readout uses an en dash with no spaces and thousands separators.
- Reading `?page=` from the address is the lists family's `pageParam()`; there is no second parser here.
- `getPageItems` never hides a single page behind an ellipsis.

Gallery anchor: `/admin/design#tables-pagination`
