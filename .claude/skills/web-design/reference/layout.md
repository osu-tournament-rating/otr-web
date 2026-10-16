# Layout and surfaces

How a page is put together: the frame, the page header or detail hero, panels with their section headers, and what goes inside a panel (rows and tiles).
Every value here comes from the beatmap pages, which are the reference. Import each component from its own file under `@/components/kit/layout/`.

- [PageFrame](#pageframe): the root of every page, loading and error screen
- [PageHeader](#pageheader): the top of a list or tool page
- [DetailHero and HeroMetaItem](#detailhero-and-herometaitem): the top of a detail page
- [HeroTabs](#herotabs): link tabs under a hero
- [HeroTabsRoot, HeroTabsList, HeroTabsTrigger, HeroTabsContent](#herotabsroot-herotabslist-herotabstrigger-herotabscontent): in-page tabs under a hero
- [Panel and PanelBody](#panel-and-panelbody): the one surface
- [SectionHeader](#sectionheader): the strip at the top of a panel
- [InfoButton](#infobutton): the one help button
- [Tile](#tile): the small bordered box inside a panel
- [StatTile and StatTileGrid](#stattile-and-stattilegrid): one number with its label
- [RowList and RowListItem](#rowlist-and-rowlistitem): divided rows inside a panel
- [Type scale](#type-scale): `typeScale`, `PageTitle`, `SectionTitle`, `RowTitle`, `Eyebrow`

## Page anatomy

A list or tool page is a PageFrame holding a PageHeader and then panels. A detail page is a PageFrame holding a DetailHero (with its tabs) and then panels. A panel starts with a SectionHeader and then holds rows, tiles, a table or a chart. The exception is the panel of a searchable or filterable list (tournaments, beatmaps, the leaderboard, audit logs, reports): it starts with its [ListToolbar](lists.md#listtoolbar), as the beatmap list does, and has no SectionHeader; the toolbar's count stands in for the header's meta. A short fixed list inside a detail page, such as teammates, keeps its SectionHeader. That is the whole nesting: never a panel or card inside a panel, never a box around a table inside a panel.

```tsx
import { ListToolbar } from '@/components/kit/lists/ListToolbar';

<PageFrame>
  <PageHeader icon={Trophy} title="Tournaments" description="…" />
  <Panel>
    <ListToolbar
      label="Search and filter tournaments"
      search={<SearchField … />}
      filters={<FilterPanel …>…</FilterPanel>}
      count="1,204 tournaments"
    />
    <RowList>…</RowList>
  </Panel>
</PageFrame>;
```

Spacing: panels sit 16px apart at every width (PageFrame and grids inside it use `gap-4`). Panels have 12px corners and 16px padding; tiles and inputs 8px corners; dialogs 12px corners and 24px padding.

## PageFrame

The root element of every `page.tsx`, `loading.tsx` and `error.tsx`. It spans the content column and keeps its children 16px apart.

```tsx
import { PageFrame } from '@/components/kit/layout/PageFrame';

export default function Page() {
  return (
    <PageFrame>
      <PageHeader … />
      <Panel>…</Panel>
    </PageFrame>
  );
}
```

- The 16px side margin on phones, the 20px margin from `sm`, the 24px top offset on phones, the 40px top offset on desktop and the 40px under the last panel all come from the root layout's `main` (`px-4 pt-6 pb-10 sm:px-5 sm:pt-10` in `apps/web/app/layout.tsx`), so a page never adds its own padding or container.
- Side-by-side panels go in a grid inside the frame: `<div className="grid gap-4 lg:grid-cols-3">`.

Do:

- Use PageFrame in the loading and error screen of the same route, so the skeleton lines up with the page.
- Keep the gap at 16px on every width.

Don't:

- Don't use `container`, `mx-auto`, `px-4 sm:px-0` or `py-6 sm:py-0` on a page root. `container` caps the width at tablet sizes, and with the layout's own margin a page's `px-4` doubles the phone gutter to 32px. Pages that still have them (the beatmap, tournament, leaderboard, player and match pages, tournament submission, filter reports, audit logs, `app/audit/layout.tsx` and most `loading.tsx` files) drop them when they move onto PageFrame.
- Don't use `gap-2`, `md:gap-2`, `gap-10` or `space-y-*` between panels (leaderboard, player, match, tournament, filter reports, admin, reports and settings pages do today).

Gallery anchor: `/admin/design#layout-page-frame`

## PageHeader

The top of every list or tool page: a muted icon, the page's h1 (30px bold), one line of description, actions on the right and a divider underneath. Detail pages use DetailHero instead.

```tsx
import { PageHeader } from '@/components/kit/layout/PageHeader';

<PageHeader
  icon={Trophy}
  title="Tournaments"
  description="Browse tournament submissions and their review status. Only verified data is included in ratings."
  actions={
    <Button asChild>
      <Link href="/tournaments/submit">
        <Upload aria-hidden />
        Submit
      </Link>
    </Button>
  }
/>;
```

Props:

- `icon`: the page's lucide icon. It renders muted at 28px; blue is for things you can act on.
- `title`: the page's only h1.
- `description`: one sentence.
- `actions`: page-level buttons. They stack full width on phones and sit on the right from `sm`.
- `back`: `{ href, label }` for a page that belongs to one entity, such as its audit history. It replaces breadcrumbs.

Do:

- Put it first in a PageFrame. It adds 8px under its divider so the first panel sits 24px below it.
- Keep the description to one line on desktop.

Don't:

- Don't hand-build a header. The ones in `app/beatmaps/page.tsx` and `app/tournaments/page.tsx` are what this component was copied from; the admin, settings, reports and filtering pages, and the centred blue title in `components/tournaments/TournamentSubmissionForm.tsx`, are the legacy versions it replaces.
- Don't colour the icon `text-primary` (the beatmap and tournament list headers do today).
- Don't use breadcrumbs (audit pages do today); use `back`.

Gallery anchors: `/admin/design#layout-page-header`, `/admin/design#layout-page-header-back`

## DetailHero and HeroMetaItem

The top of every detail page (beatmap, tournament, match, player). The entity's name is the page's h1, its status and metadata sit in one row under it, the one admin cluster is at the top right, and its view tabs attach along the bottom. With `art` it is the beatmap hero; without, the same layout on a plain panel.

```tsx
import { AdminMenu } from '@/components/kit/controls/AdminMenu';
import { IconButton } from '@/components/kit/controls/IconButton';
import { DetailHero, HeroMetaItem } from '@/components/kit/layout/DetailHero';
import { HeroTabs } from '@/components/kit/layout/HeroTabs';
import { VerificationStatusBadge } from '@/components/kit/status/VerificationStatusBadge';

<DetailHero
  title={tournament.name}
  titleSuffix={tournament.abbreviation}
  status={
    <VerificationStatusBadge
      status={tournament.verificationStatus}
      tooltip="tap"
    />
  }
  meta={
    <>
      <HeroMetaItem icon={Users}>1v1</HeroMetaItem>
      <HeroMetaItem icon={Target}>Open rank</HeroMetaItem>
      <HeroMetaItem icon={CalendarDays}>Dec 4 – 18, 2021</HeroMetaItem>
    </>
  }
  adminActions={
    isAdmin ? <AdminMenu title={tournament.name} actions={…} /> : null
  }
  actions={
    <IconButton
      variant="outline"
      icon={ExternalLink}
      label="View tournament on osu! website"
    />
  }
  tabs={<HeroTabs aria-label="Tournament views" value={tab} items={…} />}
/>;
```

Props:

- `art`: cover art that fills its box (a `fill` image, or an element with `absolute inset-0`, such as `<BeatmapCover className="absolute inset-0" … />`). The hero then draws a 192px (224px from `sm`) strip with a dark matte, and everything on it is white in both themes. Leave it out when there is no art; never show a placeholder image.
- `title`, `titleSuffix`: the name (h1, 30px bold) and muted text after it, such as a difficulty name or an abbreviation.
- `leading`: an avatar or logo before the title, for players.
- `status`: the verification status (`VerificationStatusBadge`), first in the row under the title. On art, pass the badge's `variant="overlay"`.
- `meta`: HeroMetaItems (16px icon and short text) after the status.
- `adminActions`: the single admin cluster, top right: one [AdminMenu](controls.md#adminmenu), not a row of icons. Pass it `onArt` on a hero with art.
- `actions`: public actions (audio preview, report, open on osu!, audit history), bottom right. Icon-only ones are [IconButton](controls.md#iconbutton)s. Audit pages are public, so the audit history link goes here for everyone, never in the admin menu.

On phones, a plain hero moves `actions` and `adminActions` into one row above the name, so a long name keeps the full width. On art they stay pinned to the corners, and every control there uses the dark pill, white in both themes, like the beatmap hero: `<AdminMenu onArt …/>`, `<Button variant="overlay">` and `<IconButton variant="overlay">` from the controls kit (the classes are `ON_ART_CONTROL_CLASSES` in `@/components/kit/controls/Button`). A status badge on art takes `variant="overlay"`.

- `children`: extra full-width rows under the title block, divided from each other, such as the beatmap's essentials row and difficulty picker.
- `tabs`: HeroTabs or HeroTabsList.

Do:

- Format dates and numbers before passing them in (fixed `en-US`, UTC).
- Give every icon-only action an `aria-label` and a tooltip.

Don't:

- Don't build a hero from `Card` with its own padding (`TournamentHeader` in `app/tournaments/[id]/page.tsx`, `components/matches/MatchCard.tsx`) or put the status in a separate row above the title.
- Don't scatter admin icons in different colours across the hero (tournament and match pages today); put one [AdminMenu](controls.md#adminmenu) in `adminActions`.
- Don't hand-write the dark pill classes on art controls (`components/beatmap/BeatmapHeader.tsx` passes them to `AudioPreviewButton` today); use the controls kit's `overlay` variants.
- Don't use a 36px title; the hero title follows the type scale (`components/beatmap/BeatmapHeader.tsx` uses `sm:text-4xl` today and moves to 30px when it adopts DetailHero).

Gallery anchors: `/admin/design#layout-detail-hero-art`, `/admin/design#layout-detail-hero-art-status`, `/admin/design#layout-detail-hero-tabs`, `/admin/design#layout-detail-hero-player`

## HeroTabs

Link tabs attached under a DetailHero that switch between views of one entity. The view lives in the address, so it survives a reload and can be shared.

```tsx
import { HeroTabs } from '@/components/kit/layout/HeroTabs';
import { parseHeroTab } from '@/lib/kit/layout/hero-tabs';

const TABS = ['matches', 'beatmaps', 'ratings', 'stats'] as const;
const tab = parseHeroTab((await searchParams).tab, TABS, 'matches');

<HeroTabs
  aria-label="Tournament views"
  value={tab}
  items={[
    {
      value: 'matches',
      label: 'Matches',
      count: '124',
      href: `/tournaments/${id}?tab=matches`,
      testId: 'tab-matches',
    },
    {
      value: 'beatmaps',
      label: 'Beatmaps',
      href: `/tournaments/${id}?tab=beatmaps`,
      testId: 'tab-beatmaps',
    },
  ]}
/>;
```

Props:

- `aria-label`: names the set of views. Required.
- `value`: the current tab; that link gets `aria-current="page"` and the blue underline.
- `items`: `value`, `label`, `href`, optional `icon`, `count` (already formatted; shown muted in tabular figures) and `testId`.

`parseHeroTab(raw, tabs, fallback)` reads `?tab=` and falls back for a missing or unknown value.

Do:

- Use it only to switch views of the entity in the hero.

Don't:

- Don't use the grey segmented `Tabs` bar from `components/ui/tabs.tsx` under a hero (`app/tournaments/[id]/page.tsx`, `app/matches/[id]/page.tsx` today).
- Don't use hero tabs to pick a ruleset (that is the ruleset control) or to scope a list such as All / Friends (that belongs in the list toolbar).

Gallery anchor: `/admin/design#layout-detail-hero-tabs`

## HeroTabsRoot, HeroTabsList, HeroTabsTrigger, HeroTabsContent

The same tabs for views held in component state, built on Radix Tabs for keyboard support. Prefer HeroTabs when the view should survive a reload.

```tsx
import {
  HeroTabsContent,
  HeroTabsList,
  HeroTabsRoot,
  HeroTabsTrigger,
} from '@/components/kit/layout/HeroTabsList';

<HeroTabsRoot value={view} onValueChange={setView}>
  <DetailHero
    title={match.name}
    tabs={
      <HeroTabsList aria-label="Match views">
        <HeroTabsTrigger value="games" icon={Swords} count="9">
          Games
        </HeroTabsTrigger>
        <HeroTabsTrigger value="stats" icon={ChartLine}>
          Stats
        </HeroTabsTrigger>
      </HeroTabsList>
    }
  />
  <HeroTabsContent value="games">…panels…</HeroTabsContent>
  <HeroTabsContent value="stats">…panels…</HeroTabsContent>
</HeroTabsRoot>;
```

- HeroTabsRoot wraps the hero and the views, with the 16px panel gap. Use `defaultValue` for uncontrolled tabs, or `value` with `onValueChange`.
- HeroTabsTrigger takes `value`, an optional `icon` and a `count` (already formatted), like a HeroTabs item.
- HeroTabsContent stacks its panels 16px apart.
- None of these files has `'use client'`, so a server page can pass lucide icons; controlling the value needs a client parent.

Gallery anchor: `/admin/design#layout-hero-tabs-in-page`

## Panel and PanelBody

The one surface every section sits on: 12px corners, a hairline border, `bg-card` with a shadow in light mode and a flat lighter panel in dark mode.

```tsx
import { Panel, PanelBody } from '@/components/kit/layout/Panel';

<Panel>
  <SectionHeader icon={Gauge} title="Overview" />
  <PanelBody>…</PanelBody>
</Panel>;
```

Props:

- `as`: `section` (default), `header`, `div` or `article`.
- PanelBody: the content area with the standard 16px padding. Rows, tables and charts that run edge to edge skip it.

Do:

- Start a panel with a SectionHeader, then rows, tiles, a table or a chart.
- Start a list's panel with its ListToolbar instead, above the rows or table, as the beatmap list does. Don't add a SectionHeader above the toolbar.

Don't:

- Don't use `Card` from `components/ui/card.tsx` as a page section (`<Card className="p-6 font-sans">` on the tournament page, the profile, match and stats pages today). It is the darker shadowed surface in dark mode.
- Don't put a card, a padded box or a bordered table frame inside a panel (the profile's tournament cards, the match page's nested frames, the six tables in a second bordered box).
- Don't pad a panel 24px or 48px. The home feature cards are the one stated exception.
- `SectionCard` from `components/beatmap/BeatmapSection.tsx` is the same component under its old name; new code imports Panel.

Gallery anchor: `/admin/design#layout-panel`

## SectionHeader

The strip at the top of a panel: an optional small muted icon, a 16px semibold title, an optional info button, and meta or actions on the right, over a divider.

```tsx
import { SectionHeader } from '@/components/kit/layout/SectionHeader';

<SectionHeader
  icon={Medal}
  title="Tier breakdown"
  infoText="Charts NM, HD, HR and DT scores only, grouped by each player's pre-match rating at the time of play. Tiers with fewer than 5 scores are hidden."
  meta="1,368 of 1,368 scores rated"
/>;
```

Props:

- `icon`: optional, always muted.
- `title`: sentence case. Renders as h2; pass `level={3}` (or 4) when the panel sits under another heading.
- `infoText`: how to read the section, shown through InfoButton (named "About {title}").
- `meta`: short muted text such as a count, with separators. It is set in tabular figures.
- `actions`: small controls for the whole section, after the meta. A `sm` (32px) button fits inside the 48px strip, so a header with actions is as tall as one without and side-by-side panels keep their dividers level.

Do:

- Keep it the only header style inside panels.
- Leave it out of a list's panel; that panel starts with its ListToolbar, whose count does the meta's job.

Don't:

- Don't colour section icons blue (`text-primary` on most non-beatmap pages today, such as "Tournament Statistics" in `app/tournaments/[id]/page.tsx`), and don't use 24px icons or 18px titles.
- Don't put the title in Title Case.
- `SectionHeader` from `components/beatmap/BeatmapSection.tsx` re-exports this one; new code imports it from the kit.

Gallery anchor: `/admin/design#layout-section-header`

## InfoButton

The one help affordance: a muted circled "i" beside the thing it explains. It opens on hover, on keyboard focus and on tap, so it works on phones.

```tsx
import { InfoButton } from '@/components/kit/layout/InfoButton';

<span className="flex items-center gap-1.5">
  Lobby size
  <InfoButton label="About lobby size">
    Number of players per team in each match
  </InfoButton>
</span>;
```

Props:

- `label`: the accessible name, such as "About lobby size". Required.
- `children`: the explanation, a sentence or two.
- `size`: `md` (16px glyph) beside 14px and 16px text, `sm` (14px) beside 12px labels.
- `side`, `align`: where the bubble opens.

Do:

- Use it for every inline explanation: form labels, stat labels, table headers, chart cards.
- Leave the hit area alone: the glyph is 16px (14px at `sm`) in a 20px button, and an invisible ring widens the target to 28px without moving the layout.

Don't:

- Don't use a circled question mark (`HelpCircle` in `components/ui/LabelWithTooltip.tsx`, the submission and filtering forms, `components/player/PlayerTournamentMatchTable.tsx`, `components/matches/MatchStatsHighlightCard.tsx`).
- Don't use a hover-only tooltip for an explanation (the match-page stat highlights and the beatmap edit dialog hints in `components/beatmap/BeatmapAdminView.tsx` today).
- Don't colour the glyph `text-primary`.
- Don't put it inside another button or link, such as a sortable column header; it is a button itself, so place it beside that control.

Gallery anchor: `/admin/design#layout-info-button`

## Tile

The small bordered box inside a panel, for one record or attribute: 8px corners, a faint tint and a border.

```tsx
import { Tile } from '@/components/kit/layout/Tile';

<Tile>
  <Eyebrow className="block">Most used in</Eyebrow>
  <Link href={…}>Break The Meta Cup</Link>
</Tile>;

<DialogTrigger asChild>
  <Tile asChild interactive>
    <button type="button">…</button>
  </Tile>
</DialogTrigger>;
```

Props:

- `asChild`: draw the tile chrome on the child element, such as a button.
- `interactive`: hover tint, pointer and focus ring, for a tile that opens something. Its content stacks from the top, so a button tile beside a taller tile keeps its label level with the neighbour's. Add `className="relative"` and a muted `ChevronRight` (`absolute top-2.5 right-3 size-3.5`) so it reads as openable, like the beatmap "Pooled in" tile.

Do:

- Put tiles in a grid inside a panel, `gap-2`.
- Give an Eyebrow that sits straight inside a Tile `className="block"`. Inline, it takes the body's 24px line and starts 6px lower than a neighbouring tile's label.
- Use StatTile when the tile is a label and a number.

Don't:

- Don't use the grey shadowed `StatCard` (`components/shared/StatCard.tsx`, on the tournament stats tab, the filter report and the profile) or borderless grey boxes (match stats).
- Don't put a tile on the page by itself, outside a panel.

Gallery anchor: `/admin/design#layout-tile`

## StatTile and StatTileGrid

One number with its label, such as a rating, a rank, a count or a win rate. StatTileGrid is the `dl` that lays them out, two columns on phones.

```tsx
import TierIcon from '@/components/icons/TierIcon';
import { StatTile, StatTileGrid } from '@/components/kit/layout/StatTile';

<StatTileGrid columns={3}>
  <StatTile
    label="Rating"
    value="2,215"
    adornment={
      <TierIcon tier="Grandmaster" subTier={2} tooltip width={22} height={22} />
    }
    sub="Peak 2,302"
  />
  <StatTile icon={Swords} label="Matches" value="1,204" />
</StatTileGrid>;
```

Props:

- `label`: sentence case, 12px muted. `icon` puts a small muted icon before it.
- `value`: already formatted (separators on counts, never on years or IDs). It renders 20px bold (18px semibold inline) with `leading-none`, so the value line is as tall as the text, like the beatmap tiles, and in tabular figures, so digits line up from tile to tile. Tabular figures also widen Inter's hyphen; a hyphenated word as a value (rare) takes `<span className="proportional-nums">`.
- `adornment`: sits 4px left of the value and overhangs its 20px line, so a 20–24px icon does not push the value or sub line out of step with the next tile. The profile's tier icon goes here; there is no separate tier tile. Pass TierIcon's `tooltip`: it wraps the icon in a TapTooltip, so the tier's name opens on tap, hover and keyboard focus.
- `sub`: one muted line under the value.
- `infoText`: adds a small InfoButton after the label.
- `layout="inline"`: the value on the label's line, with `children` (such as a gauge) underneath. For attribute grids like CS, AR, OD and HP.
- StatTileGrid `columns`: 2, 3 or 4 from `sm`.

Do:

- Always use StatTile inside StatTileGrid (it renders `dt` and `dd`).

Don't:

- Don't make a stat tile a button; use Tile with `asChild interactive` (the beatmap "Pooled in" tile, which uses `TileStat` from `components/beatmap/BeatmapSection.tsx`).

Gallery anchors: `/admin/design#layout-stat-tile`, `/admin/design#layout-stat-tile-inline`

## RowList and RowListItem

A list inside a panel: divided rows that run edge to edge, with no box around each item. Use it for players, tournaments, matches and events.

```tsx
import { RowList, RowListItem } from '@/components/kit/layout/RowList';
import { EntityLink } from '@/components/kit/tables/EntityLink';

<RowList>
  {teammates.map((player) => (
    <RowListItem
      key={player.id}
      leading={<OsuAvatar … />}
      title={
        <EntityLink href={`/players/${player.id}`}>{player.username}</EntityLink>
      }
      description={player.country}
      trailing={<span className="font-semibold">{player.rating}</span>}
    />
  ))}
</RowList>;
```

Props:

- `leading`, `title` (16px medium, truncates), `description` (14px muted), `trailing` (right-aligned): the standard layout. Pass only `children` for a custom row; it keeps the 16px by 12px padding.
- `href`: makes the whole row one link (not prefetched, like the beatmap lists) with the shared row cues from `@/lib/kit/tables/row`: `ROW_HOVER_TINT`, and `ROW_TITLE_HOVER`, which turns the title blue while the row is hovered. Every whole-row link (DataTableLinkRow, PhoneRow, RowListItem) uses these two, so they read the same. Only for lists whose rows already open as a whole (beatmap list, tournament list, pooled beatmaps, search results). The row must then hold no other link or button, so `title` is plain text; with only `children`, mark the name `data-row-title` yourself.
- `linkLabel`: the row link's accessible name, such as "View Break The Meta Cup". Always set it with `href`, or a screen reader reads every word in the row.

Do:

- Link the entity's name with [EntityLink](tables.md#entitylink), so every name in a row reads and hovers the same. One link per destination: an avatar in `leading` stays unlinked; to make it open the entity too, pass it as EntityLink's `leading` instead.
- Keep the hover tint only on rows that are clickable as a whole, and take it from `ROW_HOVER_TINT` rather than writing `hover:bg-muted/40` by hand.

Don't:

- Don't add new whole-row links or row dialogs.
- Don't render each item as a card inside the panel (`components/player/PlayerTournamentCard.tsx` today).

Gallery anchor: `/admin/design#layout-row-list`

## Type scale

Five sizes, all sentence case. Use the `typeScale` classes or the small components instead of picking sizes by hand.

```tsx
import {
  Eyebrow,
  PageTitle,
  RowTitle,
  SectionTitle,
  typeScale,
} from '@/components/kit/layout/Typography';

<p className={typeScale.bodyMuted}>osu! · 1v1 · Open rank</p>;
<Eyebrow>Mod distribution</Eyebrow>;
```

| Key               | Classes                                                | Use                                                   |
| ----------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| `pageTitle`       | `text-2xl font-bold tracking-tight sm:text-3xl`        | the page's h1 (PageHeader and DetailHero render it)   |
| `pageDescription` | `text-sm leading-6 text-muted-foreground sm:text-base` | the line under a page title                           |
| `sectionTitle`    | `text-base font-semibold`                              | panel and section headings (SectionHeader renders it) |
| `rowTitle`        | `text-base font-medium`                                | the name on a row or entity tile                      |
| `body`            | `text-sm`                                              | running text, table cells                             |
| `bodyMuted`       | `text-sm text-muted-foreground`                        | descriptions and row details                          |
| `label`           | `text-xs font-medium text-muted-foreground`            | field, column, tile and group labels (`Eyebrow`)      |
| `meta`            | `text-xs text-muted-foreground`                        | counts and notes beside a heading                     |

- `PageTitle` is the h1 for the rare page without PageHeader or DetailHero.
- `SectionTitle` takes `level` (2 by default).
- `RowTitle` takes `as` (`p` by default).
- `Eyebrow` is the 12px muted label; `Eyebrow` from `components/beatmap/BeatmapSection.tsx` re-exports it.

Do:

- Write every heading, label, button and status name in sentence case.
- Keep 12px (`text-xs`) as the smallest size.

Don't:

- Don't use `uppercase`, `tracking-wide`, Title Case headings ("Tournament Statistics", "Peak Day") or sizes below `text-xs`.
- Don't make a row title larger than its section title (the profile's tournament names today).

Gallery anchor: `/admin/design#layout-typography`
