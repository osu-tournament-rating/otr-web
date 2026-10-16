# Empty, error, loading and notices

What a page shows when there is nothing to show, when a request fails, while it loads, when the whole page is an outcome (not found, unauthorized, banned), and when the visitor needs to know something first.
Import each component from its own file under `@/components/kit/feedback/`; the section error stays at `@/components/error/SectionError`.

- [Choosing a state](#choosing-a-state): which component for which situation
- [EmptyState](#emptystate): nothing to show, with Clear filters when filters caused it
- [SectionError](#sectionerror): a failed request, at regular, compact and inline size
- [Skeletons](#skeletons): `PanelSkeleton`, `SectionHeaderSkeleton`, `StatTileGridSkeleton`, `TableSkeleton`, `PhoneRowListSkeleton`, `RowListSkeleton`, `SkeletonText`
- [StatusPage](#statuspage): 404, unauthorized, banned and error pages
- [Callout](#callout): the one notice box, in info, warning and danger
- [CalloutChip](#calloutchip): a short warning inside a panel
- [Legacy inventory](#legacy-inventory): every old pattern and its replacement

## Choosing a state

| Situation                                                  | Use                                            |
| ---------------------------------------------------------- | ---------------------------------------------- |
| A route is rendering                                       | its `loading.tsx`, built from the skeletons    |
| A panel's data is loading on the client                    | skeleton rows inside the real panel            |
| A request failed                                           | `SectionError`, sized to its container         |
| The whole route failed                                     | `RouteError` in the route's `error.tsx`        |
| The request worked and returned nothing                    | `EmptyState`                                   |
| The visitor's filters returned nothing                     | `EmptyState` with `clearFilters`               |
| The page itself is the outcome (404, unauthorized, banned) | `StatusPage`                                   |
| The visitor should know something before acting            | `Callout`                                      |
| A panel's data has a caveat ("Includes unverified")        | `CalloutChip`                                  |
| A site-wide notice (the weekly maintenance window)         | `Callout variant="banner"`                     |
| The result of an action (saved, deleted, could not save)   | a toast (`toast` from `sonner`), not a callout |

Sizes for empty and error states, by container:

- `regular`: the main content of a panel (a list, a table, the whole section). It is at least 288px tall, so a panel keeps its weight.
- `compact`: a chart area, a small panel in a grid, a dialog, a table inside a dialog.
- `inline` (errors only): a "Load more" page, an expanded row, a form field's options. One line, Try again beside it.

Both block sizes go straight into the panel in place of the rows, directly under its SectionHeader or ListToolbar, with no wrapper, border or extra padding: their own padding sets the space.

Copy:

- Empty titles say what is missing: "No beatmaps match" when filtered, "No pooled beatmaps" or "No tournaments yet" otherwise. The description says why or what to try, in one sentence.
- Error titles name the thing: "Tournaments could not load", "More activity could not load". No "Unable to", "Failed to" or "Please", and no full stop in a title.
- Retry buttons always read "Try again", never "Retry".

## EmptyState

Takes the place of a list, table or chart that has nothing to show, in the section error's frame with a neutral icon, so an empty panel and a failed one line up.

```tsx
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { ListToolbar } from '@/components/kit/lists/ListToolbar';

// A filterable list's panel starts with its ListToolbar (layout.md).
<Panel>
  <ListToolbar
    label="Search and filter tournaments"
    search={<SearchField … />}
    rulesets={<RulesetChips … />}
    count={formatCountOf(rows.length, 'tournament')}
  />
  {rows.length === 0 ? (
    <EmptyState
      title={isFiltered ? 'No tournaments match' : 'No tournaments yet'}
      description={
        isFiltered
          ? 'Try a different name, ruleset, or fewer filters.'
          : 'No tournament submissions are available right now.'
      }
      clearFilters={isFiltered ? { href: clearFiltersHref } : undefined}
      data-testid="tournament-empty-state"
    />
  ) : (
    <RowList>…</RowList>
  )}
</Panel>;

// A chart with too little data:
<EmptyState
  size="compact"
  icon={ChartNoAxesColumn}
  title="Not enough data"
  description="The chart appears once 10 scores are verified."
/>;
```

Props that matter:

- `title`: what is missing. `description`: one sentence.
- `icon`: neutral, never red; defaults to a crossed-out magnifier (`SearchX`). Pick one that names the thing (`ChartNoAxesColumn` for a chart, `Music` for beatmaps, `ClipboardList` for audit events).
- `clearFilters`: `{ href }` (the list's address without its filter parameters) or `{ onClick }`. Adds an outline "Clear filters" button, the controls family's `Button` at `default` size in the regular state and `sm` in the compact one. Only when the visitor's filters emptied the list.
- `action`: another way forward, such as a "Submit a tournament" link, after Clear filters. Make it a kit `Button` (`@/components/kit/controls/Button`) at the same size as Clear filters.
- `size`: `regular` (default) or `compact`.
- `titleAs`: the title element. Regular is an `h2` and compact a `p`; pass `h3` when the panel's own header is the `h2` and the outline needs it.
- Other props (`data-testid`, `className`) go on the root.

Do:

- Put it inside the panel, in place of the rows, under the panel's SectionHeader or the list's ListToolbar.
- Make "Clear filters" clear filters only. It never resets the search, sort, ruleset or tab (finding 22). Today the beatmap and tournament lists link to the bare list address, which also drops the search; build the `href` from the current address minus the filter parameters.

Don't:

- Don't write a bare line of muted text for an empty list ("No results.", "No matches found").
- Don't use a red icon or `role="alert"`; nothing failed.
- Don't use it in a combobox or command menu; `CommandEmpty` text stays there.
- Don't use it for a failed request. A failure that shows "No results" hides the problem; use SectionError.

Gallery anchors: `/admin/design#feedback-empty-state`, `/admin/design#feedback-empty-state-filtered`, `/admin/design#feedback-empty-state-compact`

## SectionError

Takes the place of a section whose data failed to load, with Try again, so a failure never reads as an empty list. It is a default export and already used by the tournament list, the reports pages, the audit timelines and `SectionErrorBoundary`.

```tsx
import SectionError from '@/components/error/SectionError';

// A whole section:
<SectionError
  title="Tournaments could not load"
  retrying={isValidating}
  onRetry={() => void mutate()}
/>;

// A chart, a small panel or a dialog:
<SectionError
  size="compact"
  title="Rating history could not load"
  onRetry={retry}
/>;

// A failed "Load more" at the end of an activity feed, centred under the rows:
<div className="border-t px-4 py-4">
  <SectionError
    size="inline"
    title="More activity could not load"
    retrying={isValidating}
    onRetry={() => void mutate()}
    className="justify-center"
  />
</div>;
```

Props that matter:

- `title`: "<Thing> could not load".
- `onRetry`, `retrying`: `retrying` disables the button and spins its icon. Pass SWR's `isValidating`, or a transition's pending flag.
- `size`: `regular` (default; an `h2`, a 48px icon and a sentence), `compact` (a 36px icon and a 14px title, no sentence unless you pass one) or `inline` (one line: a 16px red icon, the title, a small Try again).
- `description`: regular falls back to "This is temporarily unavailable. Try the request again."; compact shows only what you pass; inline takes none.
- `className`: on the root. Inline is left-aligned; add `justify-center` under a centred list.

Do:

- Keep the whole failed area as the error: in a panel it replaces the rows, under the SectionHeader.
- Use `inline` for a failure inside content that otherwise loaded, so the loaded rows stay.
- Wrap server-rendered sections in `SectionErrorBoundary` (`components/error/SectionErrorBoundary.tsx`), which renders the regular size.

Don't:

- Don't build a Retry row by hand (see the legacy inventory) or colour the message `text-destructive`; the icon carries the red.
- Don't show a toast for a failed load; toasts are for actions.

Gallery anchors: `/admin/design#feedback-section-error`, `/admin/design#feedback-empty-state-compact`, `/admin/design#feedback-section-error-inline`

## Skeletons

Building blocks for loading screens, shaped like the kit's panels, section headers, stat tiles, tables, phone rows and lists, so a loading screen matches its page and nothing shifts when the data arrives. Each one renders the real kit component (Panel, SectionHeader, StatTile, DataTable, PhoneRow, RowList) with bars in place of the data, so the gallery's Loading and Loaded states measure the same at 1440 and 390px.

```tsx
import {
  PanelSkeleton,
  PhoneRowListSkeleton,
  RowListSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
  StatTileGridSkeleton,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';

// app/admin/reports/loading.tsx
export default function AdminReportsLoading() {
  return (
    <PageFrame>
      <PageHeader
        icon={Flag}
        title="Reports"
        description="Review and resolve data reports."
      />
      <PanelSkeleton label="Loading reports">
        <SectionHeaderSkeleton icon={ListChecks} title="Open reports" />
        <TableSkeleton
          columns={[
            { label: 'Type', width: 'w-28' },
            { label: 'Entity' },
            { label: 'Reason', showFrom: 'lg' },
            { label: 'Status', width: 'w-32' },
            { label: 'Submitted', width: 'w-32', align: 'end' },
          ]}
          phoneRows={<PhoneRowListSkeleton />}
        />
      </PanelSkeleton>
    </PageFrame>
  );
}
```

The parts:

- `PanelSkeleton`: the Panel surface. Give it children, or none for a header strip and a body block (charts, or any panel that is hard to sketch); then set its height to the loaded panel's, such as `className="h-[23rem]"`. `label` makes it the screen's `role="status"` region.
- `SectionHeaderSkeleton`: renders the real SectionHeader with the static `title` and `icon`, and bars for the meta (`meta`, on by default) and `actions` (a count of 32px button placeholders). Without a title it draws a bar in the title's place.
- `StatTileGridSkeleton`: the real StatTileGrid and StatTiles with their static `labels`, bars for the values, and `sub` for the line under them. Same `columns` as the loaded grid.
- `TableSkeleton`: a real `DataTable` (fixed layout, hidden from assistive tech) with its tinted header strip and `rows` of bars. `columns` is a count, or the loaded table's columns, in DataTable's terms: `label` (the real header), `width` (a width class; columns without one share the rest), `align: 'end'` for numbers, `showFrom` for a column the loaded table hides below a breakpoint. `cellHeight` is the height of the tallest thing in a loaded cell and so sets the row height: `h-6` (default) for a 24px avatar or badge, as in the beatmap tables; `h-5` plain text; `h-8` a 32px avatar; `h-9` a two-line cell. `phoneRows` works as on DataTable. `className` goes on the table's wrapper.
- `PhoneRowListSkeleton`: the real PhoneRowList and PhoneRows, for `phoneRows`. Match the loaded rows' parts: `rank`, `avatar` (24px, inside the name), `description` (on by default), `value` (on by default) and `valueDescription`.
- `RowListSkeleton`: the real RowList with bars for the title, `description` and `trailing` number, and a `leading` avatar, `square`, `cover` or `none`. For lists built from RowList, not for tables (their phone rows are PhoneRows, which are shorter).
- `SkeletonText`: an inline bar that keeps the height of the line it stands in for. Use it inside a real component, such as a PageHeader description whose text is not static: `description={<SkeletonText className="w-72" />}`. Inside a flex container wrap it in a `<span>`, or the line shrinks to the bar's 16px.

Do:

- Build `loading.tsx` from the same PageFrame, PageHeader or DetailHero and panels as the page, with the real static text (titles, labels, column headers), and change it whenever the page's layout changes.
- Copy the loaded table's column widths, alignment and `showFrom` into `columns`, and check with the browser that a row is the same height loading and loaded.
- Announce once per screen: `label` on one PanelSkeleton, or `role="status"` and `aria-label` on the PageFrame.
- Inside an already-rendered panel (a client fetch, an expanded row), show two or three skeleton rows where the content goes instead of a spinner.

Don't:

- Don't draw a whole panel as one grey block (`Skeleton className="h-[23rem] rounded-xl"` in `app/beatmaps/[id]/loading.tsx`); use PanelSkeleton at that height so the border and header strip show.
- Don't put a spinner and "Loading…" text inside a panel (`app/reports/MyReportsClient.tsx`, `app/admin/reports/AdminReportsClient.tsx`, `components/audit/CascadeContextBanner.tsx`, `components/audit/AuditEventCard.tsx`).
- Don't copy old page chrome into a skeleton: `Card`, blue 24px section icons and Title Case titles in `app/leaderboard/loading.tsx`, `app/admin/reports/loading.tsx` and `components/player/PlayerSectionSkeletons.tsx`.
- Don't use random widths; server and client must render the same markup.

The site-wide spinner in `app/loading.tsx` stays for routes without a page-shaped skeleton.

Gallery anchors: `/admin/design#feedback-skeleton-panel`, `/admin/design#feedback-skeleton-table` (TableSkeleton and PhoneRowListSkeleton), `/admin/design#feedback-skeleton-rows`

## StatusPage

The one layout for pages that are an outcome rather than content: not found, unauthorized, banned, and route errors. An icon, a short h1, one sentence and one action, centred in the content column like the route error screen.

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { Compass } from 'lucide-react';

import { Button } from '@/components/kit/controls/Button';
import { StatusPage } from '@/components/kit/feedback/StatusPage';

// app/not-found.tsx
export default function NotFound() {
  return (
    <StatusPage
      icon={Compass}
      title="Page not found"
      description="This page does not exist or has moved."
      background={
        <Image
          src="/images/error-background.svg"
          alt=""
          fill
          sizes="100vw"
          // The art is empty in the middle: on phones show all of it at
          // the top, so the shapes flank the icon and stay off the text.
          className="object-contain object-top sm:object-cover sm:object-center"
        />
      }
      action={
        <Button asChild>
          <Link href="/">Go to the home page</Link>
        </Button>
      }
    />
  );
}

// app/auth/banned/page.tsx
<StatusPage
  icon={ShieldAlert}
  tone="destructive"
  title={<span data-testid="banned-heading">Account suspended</span>}
  description="Contact the admins if you think this is a mistake."
>
  {reason ? (
    <p className="text-muted-foreground">
      <span className="font-medium text-foreground">Reason:</span>{' '}
      <span data-testid="banned-reason">{reason}</span>
    </p>
  ) : null}
</StatusPage>;
```

Props that matter:

- `icon`, `tone`: `neutral` (default; a muted icon on a grey disc) for not found and unauthorized, `destructive` (red icon) for bans and failures.
- `title`: the page's h1, a few words in sentence case. It takes a node, so a test id can sit on a span inside it.
- `description`: one sentence.
- `action`: one kit `Button` at `default` size, like EmptyState's and Callout's `action`. A route error may put a way back before its Try again (pass both in a fragment: `<Button asChild variant="outline" icon={ArrowLeft}>` on the link, then `<Button icon={RefreshCw}>Try again</Button>`), as `RouteError` does; nothing else gets two.
- `background`: decorative art behind the content, hidden from assistive tech. The 404's blurred shapes go here; give the image `alt=""`.
- `children`: one detail between the sentence and the action, such as a ban reason. It is centred in 14px text, up to 384px wide.
- Other props (`role`, `data-testid`, `className`) go on the root. Pass `role="alert"` for an error screen.

Do:

- Render it straight from the page; the root layout's `main` already provides the margins.
- Use the primary button for the one way forward.

Don't:

- Don't use a large blue heading (`text-4xl text-primary` in `app/not-found.tsx` and `app/unauthorized/page.tsx`) or a card around the message (`rounded-4xl bg-card` on unauthorized, the bordered card on banned).
- Don't render another `<main>` inside the layout's (`app/auth/banned/page.tsx` does today).
- Don't use `container mx-auto` (`components/error/RouteError.tsx` today).

Gallery anchors: `/admin/design#feedback-status-page`, `/admin/design#feedback-status-page-variants`

## Callout

The one notice box. Info for context, warning for something to check before acting, danger for something that cannot be undone. The tone sets the fill, border, text and glyph (info circle, triangle, octagon) from the colour family's `callout-*` tokens.

```tsx
import { Callout } from '@/components/kit/feedback/Callout';

<Callout tone="warning" title="Host compliance">
  Get written permission from osu! support before filtering an officially
  supported tournament. <Link href={RULES_URL}>Read the filtering rules</Link>
</Callout>;

// Button is the controls family's: @/components/kit/controls/Button
<Callout
  tone="danger"
  action={
    <Button variant="destructive" size="sm" icon={Trash2}>
      Delete account
    </Button>
  }
>
  Deleting your account removes your API keys and reports for good. Your player
  profile stays public.
</Callout>;

// components/banner/MaintenanceBanner.tsx
<Callout
  tone="warning"
  variant="banner"
  role="status"
  data-testid="maintenance-window-banner"
>
  Ratings are recalculating. The site may be slow until 12:15 UTC.
</Callout>;
```

Props that matter:

- `tone`: `info` (default), `warning`, `danger`.
- `title`: a short sentence-case lead, in semibold. Leave it out for a one-line note.
- `children`: one or two sentences. Links inside are underlined in the tone's colour.
- `action`: one kit `Button` at `sm`, or a Button drawn on a link with `asChild`, on the right from `sm` and under the text on phones. It keeps the normal text colour.
- `icon`: replaces the tone's glyph when a closer one exists.
- `variant`: `block` (default; 8px corners, 16px by 12px padding) or `banner` (full width, a bottom border, 12px centred text) for the strip under the site header.
- Other props (`role`, `data-testid`) go on the root. It has no role by default; give a banner `role="status"`.

Do:

- Put a page's callout directly under its PageHeader or DetailHero, or at the top of the panel it is about.
- Use info for context, not the link blue: the info tone is a quiet slate.
- Start a destructive action with the kit Button's `destructive` variant (red text and border, no fill); solid red is only in the final confirm dialog (finding 35).

Don't:

- Don't build notices from palette classes (`orange-*`, `amber-*`, `yellow-*`, `blue-*`) or tint shadcn `Alert` with overrides. `@/components/ui/alert` stays as a primitive; new code uses Callout.
- Don't stack several callouts; merge them, or move the less important one into the page.
- Don't use a callout for an action's result; that is a toast.
- Don't use a callout for "Not in ratings yet" on a detail page; that is `NotInRatings variant="notice"` from the status family.

Gallery anchors: `/admin/design#feedback-callout`, `/admin/design#feedback-callout-action`, `/admin/design#feedback-callout-banner`

## CalloutChip

A short notice inside a panel, such as "Includes unverified" on a chart: the callout's colours on a small outlined chip (the status family's `Badge` with `shape="rounded"`). With `detail` it becomes a button whose explanation opens on tap, hover and focus.

```tsx
import { ShieldQuestion } from 'lucide-react';

import { CalloutChip } from '@/components/kit/feedback/CalloutChip';

<SectionHeader
  icon={ChartNoAxesColumn}
  title="Mod distribution"
  meta="1,368 scores"
  actions={
    <CalloutChip
      icon={ShieldQuestion}
      detail="Includes data that has not been verified"
    >
      Includes unverified
    </CalloutChip>
  }
/>;
```

Props that matter:

- `tone`: `warning` (default), `info`, `danger`.
- `children`: two or three words.
- `detail`: the explanation. The chip's text is the button's accessible name.
- `icon`: replaces the tone's glyph, such as a shield for unverified data.
- `size`: `md` (24px, default) in a section header, `sm` (20px) beside 12px text.

Do:

- Put it in the SectionHeader's `actions`, or beside the one thing it qualifies.

Don't:

- Don't use it as a label for an entity's attribute (a mod, a ruleset, a role); that is the status family's `Badge`.
- Don't write a sentence in it; use a Callout.

Gallery anchor: `/admin/design#feedback-callout-chip`

## Legacy inventory

Every empty, error, loading, status and notice pattern that exists today, and what replaces it in the migration.

| Today                                                                      | Where                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Replacement                                                                                                                                                              |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BeatmapEmptyState` (`testId`, `body`, `action`)                           | `components/beatmaps/BeatmapEmptyState.tsx`, used by `components/beatmaps/list/BeatmapListGrid.tsx`, `components/player/PlayerBeatmapsList.tsx`, `components/tournaments/TournamentBeatmapsAdminView.tsx`                                                                                                                                                                                                                                                                                                            | `EmptyState` (same frame): `data-testid`, `description`, `clearFilters` or `action`                                                                                      |
| Tournament list `EmptyState` with a Clear filters link                     | `components/tournaments/list/TournamentList.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `EmptyState` with `clearFilters={{ href }}`                                                                                                                              |
| Faded 48px `ClipboardList` empty states                                    | `EmptyState` in `components/audit/AuditEventFeed.tsx`, `TimelineEmptyState` in `components/audit/AuditEntityTimeline.tsx`                                                                                                                                                                                                                                                                                                                                                                                            | `EmptyState icon={ClipboardList}`; the filtered feed adds `clearFilters`                                                                                                 |
| "Not enough data" line in beatmap charts                                   | `EmptyState` in `components/beatmap/BeatmapSection.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `EmptyState size="compact"`                                                                                                                                              |
| Bare empty text                                                            | `app/reports/MyReportsClient.tsx`, `app/admin/reports/AdminReportsClient.tsx`, `app/leaderboard/data-table.tsx`, `components/tournaments/TournamentRatingsView.tsx`, `components/tournaments/TournamentMatchesLedger.tsx`, `components/tournaments/TournamentTopPerformers.tsx`, `components/player/PlayerTournamentMatchTable.tsx`, `components/player/PlayerTournamentCard.tsx`, `components/stats/RatingDistributionChart.tsx`, `components/search/SearchCommandDialog.tsx`, `app/admin/AdminDashboardClient.tsx` | `EmptyState`: regular for a whole panel, compact in a chart, card, table cell area or dialog                                                                             |
| `LoadMoreError` (outline "Retry")                                          | `components/tournaments/list/TournamentList.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `SectionError size="inline"` with `className="justify-center"`                                                                                                           |
| Retry button under "Report reasons could not be loaded."                   | `components/reports/ReportButton.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `SectionError size="inline"` in place of the description and button                                                                                                      |
| "Unable to load affected …" in red text with Retry                         | `components/audit/CascadeContextBanner.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `SectionError size="inline"`                                                                                                                                             |
| "Unable to load audit entries." with Retry                                 | `components/audit/AuditEventCard.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `SectionError size="inline"`                                                                                                                                             |
| "Search failed. Try again in a moment." block                              | `components/search/SearchCommandDialog.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `SectionError size="compact" title="Search failed"`                                                                                                                      |
| "Failed to load more beatmaps. Please try again." line                     | `components/player/PlayerBeatmapsList.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `SectionError size="inline"` with `onRetry={handleLoadMore}`                                                                                                             |
| `SectionError` inside `Card`                                               | `components/error/SectionErrorBoundary.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | the same inside `Panel`                                                                                                                                                  |
| Spinner and "Loading…" text inside a panel                                 | `app/reports/MyReportsClient.tsx`, `app/admin/reports/AdminReportsClient.tsx`, `components/audit/CascadeContextBanner.tsx`, `components/audit/AuditEventCard.tsx`                                                                                                                                                                                                                                                                                                                                                    | `TableSkeleton` with `PhoneRowListSkeleton` in the panel; two `RowListSkeleton` rows in an expanded row                                                                  |
| Card skeletons with blue icons and Title Case titles                       | `app/leaderboard/loading.tsx`, `app/admin/reports/loading.tsx`, `components/player/PlayerSectionSkeletons.tsx`                                                                                                                                                                                                                                                                                                                                                                                                       | `PanelSkeleton` with `SectionHeaderSkeleton` and the matching table, rows or tiles                                                                                       |
| Whole-panel grey blocks                                                    | `app/beatmaps/[id]/loading.tsx` and other `loading.tsx` files                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `PanelSkeleton` at the same height                                                                                                                                       |
| No loading screen                                                          | `app/reports` (My reports)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | a `loading.tsx` built from the skeletons                                                                                                                                 |
| Blue "404 Not Found" over the background art                               | `app/not-found.tsx` (`e2e/player-profile.e2e.ts` looks for its text)                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `StatusPage` with `background`; update the test                                                                                                                          |
| "Unauthorized" card with a blue heading                                    | `app/unauthorized/page.tsx` (test ids and text in `e2e/static-pages.e2e.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                         | `StatusPage icon={Lock}`, keeping `unauthorized-container` and `unauthorized-heading`; update the expected text                                                          |
| "Account Suspended" card with a red reason box                             | `app/auth/banned/page.tsx` (test ids and text in `e2e/static-pages.e2e.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                          | `StatusPage tone="destructive"`, reason in `children`, keeping `banned-heading` and `banned-reason`; the test expects "Account Suspended", so change it to sentence case |
| Route error screen with `container mx-auto`                                | `components/error/RouteError.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `RouteError` renders `StatusPage tone="destructive" role="alert"`                                                                                                        |
| "Host Compliance" `Alert` tinted `warning` with `dark:text-yellow-*`       | `app/tools/filter/FilteringPageClient.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `Callout tone="warning" title="Host compliance"`                                                                                                                         |
| "Filtering is temporarily unavailable" `Alert` in `orange-*`               | `app/tools/filter/FilteringPageClient.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `Callout tone="warning"`                                                                                                                                                 |
| Blue "Filtering Information" `Alert`                                       | `components/filtering/FilterComplianceNotice.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `Callout tone="info"` with the copy button as `action`; the time and report ID go in tiles                                                                               |
| Orange maintenance strip                                                   | `components/banner/MaintenanceBanner.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `Callout variant="banner" tone="warning" role="status"`                                                                                                                  |
| "Saving is permanent" `Alert variant="destructive"` with overrides         | `components/beatmap/BeatmapAdminView.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `Callout tone="danger"`                                                                                                                                                  |
| "Something went wrong" `Alert variant="destructive"` after a failed action | `app/settings/ApiKeySettingsClient.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | a toast, or `Callout tone="danger"` when the error must stay on screen                                                                                                   |
| Red-bordered "Delete Account" card with a solid red button                 | `app/settings/AccountDeletionClient.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | a settings panel with `Callout tone="danger"` and a `destructive` (red outline) Button as `action`; solid red only in the confirm dialog                                 |
| Blue cascade banner (`bg-blue-50/50 border-l-blue-400`)                    | `components/audit/CascadeContextBanner.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `Callout tone="info"` (the audit redesign may make it a plain row)                                                                                                       |
| `UnverifiedDataBadge` (shadcn `Badge` tinted `warning`)                    | `components/badges/UnverifiedDataBadge.tsx`, in `components/beatmap/BeatmapDistributionsCard.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                    | `CalloutChip icon={ShieldQuestion} detail=…`                                                                                                                             |
