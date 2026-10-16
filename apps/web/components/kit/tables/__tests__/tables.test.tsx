import { describe, expect, it } from 'bun:test';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/kit/tables/DataTable';
import {
  DataTableLinkCell,
  DataTableLinkRow,
} from '@/components/kit/tables/DataTableLinkRow';
import { EntityLink } from '@/components/kit/tables/EntityLink';
import { LoadMore } from '@/components/kit/tables/LoadMore';
import { MissingValue } from '@/components/kit/tables/MissingValue';
import { PaginationFooter } from '@/components/kit/tables/PaginationFooter';
import { PhoneRow, PhoneRowList } from '@/components/kit/tables/PhoneRow';
import { SortableHeader } from '@/components/kit/tables/SortableHeader';
import { ViewButton } from '@/components/kit/tables/ViewButton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { formatCount } from '@/lib/kit/format/number';
import { ROW_HOVER_TINT, ROW_TITLE_HOVER } from '@/lib/kit/tables/row';
import type { SortState } from '@/lib/kit/lists/sort';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>);

const noop = () => {};

describe('DataTable', () => {
  it('runs edge to edge with 16px at the first and last cell', () => {
    const html = render(
      <DataTable aria-label="Leaderboard">
        <DataTableBody>
          <DataTableRow>
            <DataTableCell>mrekk</DataTableCell>
          </DataTableRow>
        </DataTableBody>
      </DataTable>
    );

    expect(html).toContain('data-slot="data-table"');
    expect(html).toContain('aria-label="Leaderboard"');
    expect(html).toContain('[&amp;_tr&gt;*:first-child]:pl-4');
    expect(html).toContain('[&amp;_tr&gt;*:last-child]:pr-4');
    expect(html).not.toContain('rounded-lg border');
  });

  it('hides the table on phones only when it has phone rows', () => {
    const plain = render(<DataTable />);
    expect(plain).not.toContain('hidden md:block');
    expect(plain).not.toContain('data-table-phone');

    const html = render(
      <DataTable phoneRows={<PhoneRowList aria-label="Rows" />} />
    );
    expect(html).toContain('hidden md:block');
    expect(html).toContain('data-slot="data-table-phone" class="md:hidden"');
  });

  it('keeps the table on phones when phone rows are null', () => {
    const html = render(<DataTable phoneRows={null} />);
    expect(html).not.toContain('hidden md:block');
    expect(html).not.toContain('data-table-phone');
  });

  it('sticks the header under the site header or in its scroll box', () => {
    expect(render(<DataTable stickyHeader />)).toContain(
      'md:[&amp;_th]:sticky'
    );
    expect(render(<DataTable stickyHeader="page" />)).toContain(
      'md:[&amp;_th]:top-(--header-height-px)'
    );
    const scrollArea = render(<DataTable stickyHeader="scroll-area" />);
    expect(scrollArea).toContain('[&amp;_th]:top-0');
    expect(scrollArea).not.toContain('md:[&amp;_th]:sticky');
  });

  it('puts the header on a tinted strip with 12px muted labels', () => {
    const html = render(
      <table>
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead>Player</DataTableHead>
            <DataTableHead numeric showFrom="lg">
              Matches
            </DataTableHead>
          </DataTableRow>
        </DataTableHeader>
      </table>
    );

    expect(html).toContain('[&amp;_tr]:bg-muted');
    expect(html).toContain('h-8');
    expect(html).toContain('text-xs');
    expect(html).toContain('text-muted-foreground');
    expect(html).toContain('text-right hidden lg:table-cell');
  });

  it('adds an info button beside a header label', () => {
    const html = render(
      <table>
        <thead>
          <tr>
            <DataTableHead info="Share of verified matches won.">
              Win rate
            </DataTableHead>
          </tr>
        </thead>
      </table>
    );

    expect(html).toContain('aria-label="About Win rate"');
  });

  it('right-aligns numbers with tabular figures', () => {
    const html = render(
      <table>
        <tbody>
          <tr>
            <DataTableCell numeric>{formatCount(1204)}</DataTableCell>
          </tr>
        </tbody>
      </table>
    );

    expect(html).toContain('text-right tabular-nums');
    expect(html).toContain('1,204');
  });

  it('shows a muted em dash for a missing value', () => {
    const cell = (children: React.ReactNode, empty?: boolean) =>
      render(
        <table>
          <tbody>
            <tr>
              <DataTableCell empty={empty}>{children}</DataTableCell>
            </tr>
          </tbody>
        </table>
      );

    for (const missing of [null, undefined, '', formatCount(null)]) {
      expect(cell(missing)).toContain('data-slot="missing-value"');
    }
    expect(cell(0)).not.toContain('missing-value');
    expect(cell(null, false)).not.toContain('missing-value');
  });

  it('gives a plain row no hover tint', () => {
    const html = render(
      <table>
        <tbody>
          <DataTableRow highlight>
            <td>Yasui</td>
          </DataTableRow>
        </tbody>
      </table>
    );

    expect(html).not.toContain('hover:bg-muted/40');
    expect(html).toContain('bg-primary/10');
  });
});

describe('DataTableLinkRow', () => {
  it('tints on hover and holds one overlay link in its link cell', () => {
    const html = render(
      <table>
        <tbody>
          <DataTableLinkRow>
            <DataTableLinkCell
              href="/beatmaps/4012345"
              label="View ORESAMA - Hotohashiru [Extra]"
            >
              <span data-row-title>Hotohashiru</span>
            </DataTableLinkCell>
            <DataTableCell numeric>330</DataTableCell>
          </DataTableLinkRow>
        </tbody>
      </table>
    );

    expect(html).toContain(ROW_HOVER_TINT);
    expect(html).toContain(ROW_TITLE_HOVER.replaceAll('&', '&amp;'));
    expect(html).toContain('cursor-pointer');
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="/beatmaps/4012345"');
    expect(html).toContain('aria-label="View ORESAMA - Hotohashiru [Extra]"');
    expect(html).toContain('data-row-link=""');
    expect(html).toContain('absolute inset-0 z-10');
  });
});

describe('SortableHeader', () => {
  const sort: SortState<'rating' | 'name'> = {
    key: 'rating',
    direction: 'desc',
  };

  it('marks the sorted column and offers the flipped sort', () => {
    const html = render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              sortKey="rating"
              sort={sort}
              getSortHref={(next) =>
                `/leaderboard?sort=${next.key}&dir=${next.direction}`
              }
              numeric
            >
              Rating
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(html).toContain('aria-sort="descending"');
    expect(html).toContain('href="/leaderboard?sort=rating&amp;dir=asc"');
    expect(html).toContain('text-foreground');
    // The arrow leads on a right-aligned column.
    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('Rating'));
  });

  it('starts another column at its default direction', () => {
    const html = render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              sortKey="name"
              sort={sort}
              getSortHref={(next) => `?sort=${next.key}&dir=${next.direction}`}
              defaultDirection="asc"
            >
              Player
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(html).toContain('aria-sort="none"');
    expect(html).toContain('href="?sort=name&amp;dir=asc"');
    expect(html.indexOf('Player')).toBeLessThan(html.indexOf('<svg'));
  });

  it('renders a button for a list sorted in state', () => {
    const html = render(
      <table>
        <thead>
          <tr>
            <SortableHeader sortKey="rating" sort={sort} onSortChange={noop}>
              Rating
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(html).toContain('<button type="button"');
    expect(html).not.toContain('<a ');
  });
});

describe('EntityLink', () => {
  it('puts the avatar inside the link and names the link by the name', () => {
    const html = render(
      <EntityLink
        href="/players/1"
        leading={<span role="img" aria-label="mrekk's avatar" />}
      >
        mrekk
      </EntityLink>
    );

    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="/players/1"');
    expect(html).toContain('<span aria-hidden="true" class="flex shrink-0">');
    expect(html).toContain('<span class="min-w-0 truncate">mrekk</span>');
    expect(html).toContain('hover:text-primary');
  });
});

describe('ViewButton', () => {
  it('is a labelled outline button that opens a dialog', () => {
    const html = render(<ViewButton subject="report 1204" onClick={noop} />);

    expect(html).toContain('>View</button>');
    expect(html).toContain('aria-label="View report 1204"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('type="button"');
    expect(html).toContain('data-variant="outline"');
    expect(html).toContain('h-8');
  });
});

describe('PhoneRow', () => {
  it('lines rows up on shared columns', () => {
    const html = render(
      <PhoneRowList as="ol" aria-label="Leaderboard">
        <PhoneRow
          rank="#1"
          title="mrekk"
          description="58 tournaments"
          valueAdornment={<span>tier</span>}
          value="3,121"
        />
      </PhoneRowList>
    );

    expect(html).toStartWith('<ol data-slot="phone-row-list"');
    expect(html).toContain('grid-cols-[auto_minmax(0,1fr)_auto]');
    expect(html).toContain('grid-cols-subgrid');
    expect(html).toContain('#1');
    // The adornment sits 4px left of the value.
    expect(html).toContain(
      'flex items-center justify-end gap-1 text-sm font-semibold tabular-nums"><span>tier</span>3,121'
    );
  });

  it('shows a muted em dash for a missing value', () => {
    const html = render(<PhoneRow title="Taiko Classic 2025" value={null} />);
    expect(html).toContain('data-slot="missing-value"');
  });

  it('makes the whole row one tinted link only when given href', () => {
    const plain = render(<PhoneRow title="mrekk" />);
    expect(plain).not.toContain('<a ');
    expect(plain).not.toContain(ROW_HOVER_TINT);

    const linked = render(
      <PhoneRow
        href="/tournaments/1"
        linkLabel="View Corsace Open 2025"
        title="Corsace Open 2025"
      />
    );
    expect(linked.match(/<a /g)).toHaveLength(1);
    expect(linked).toContain('aria-label="View Corsace Open 2025"');
    expect(linked).toContain(ROW_HOVER_TINT);
    expect(linked).toContain(ROW_TITLE_HOVER.replaceAll('&', '&amp;'));
  });
});

describe('PaginationFooter', () => {
  it('renders nothing for a single page', () => {
    expect(
      render(
        <PaginationFooter
          page={1}
          pageSize={50}
          totalCount={50}
          getPageHref={String}
        />
      )
    ).toBe('');
  });

  it('shows the readout and page links', () => {
    const html = render(
      <PaginationFooter
        page={84}
        pageSize={50}
        totalCount={8412}
        getPageHref={(page) => `/tournaments?page=${page}`}
        label="Tournament pages"
      />
    );

    expect(html).toContain('4,151–4,200 of 8,412');
    expect(html).toContain('aria-label="Tournament pages"');
    expect(html).toContain('href="/tournaments?page=83"');
    expect(html).toContain('href="/tournaments?page=169"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('84 / 169');
  });

  it('disables Previous on the first page without a link', () => {
    const html = render(
      <PaginationFooter
        page={1}
        pageSize={50}
        totalCount={8412}
        getPageHref={(page) => `?page=${page}`}
      />
    );

    expect(html).toContain('role="link" aria-disabled="true"');
    expect(html).not.toContain('href="?page=0"');
    expect(html).toContain('href="?page=2"');
  });

  it('draws pages as kit buttons and narrow arrows as icon buttons', () => {
    const html = render(
      <PaginationFooter
        page={2}
        pageSize={50}
        totalCount={8412}
        getPageHref={(page) => `?page=${page}`}
      />
    );

    // Page links are ghost kit Buttons, the current one outline.
    expect(html).toMatch(/<a [^>]*data-variant="ghost"[^>]*href="\?page=3"/);
    expect(html).toMatch(
      /<a [^>]*data-variant="outline"[^>]*aria-current="page"/
    );
    // Each arrow is also an IconButton for the narrow footer, with a tooltip
    // instead of a native title.
    expect(html.match(/data-slot="icon-button"/g)).toHaveLength(2);
    expect(html).toMatch(
      /<a [^>]*data-slot="icon-button"[^>]*aria-label="Next page"[^>]*href="\?page=3"/
    );
    expect(html).not.toContain('title=');
  });

  it('uses buttons for a list paged in state', () => {
    const html = render(
      <PaginationFooter
        page={169}
        pageSize={50}
        totalCount={8412}
        onPageChange={noop}
      />
    );

    expect(html).not.toContain('<a ');
    expect(html).toContain('disabled=""');
    expect(html).toContain('8,401–8,412 of 8,412');
  });
});

describe('LoadMore', () => {
  it('counts what is showing and offers more', () => {
    const html = render(
      <LoadMore onLoadMore={noop} hasMore shownCount={50} totalCount={1214} />
    );

    expect(html).toContain('Showing 50 of 1,214');
    expect(html).toContain('Load more');
  });

  it('spins and disables while loading', () => {
    const html = render(<LoadMore onLoadMore={noop} hasMore loading />);
    expect(html).toContain('animate-spin');
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Load more');
  });

  it('gives way to an end note', () => {
    const html = render(
      <LoadMore onLoadMore={noop} hasMore={false} shownCount={214} />
    );
    expect(html).toContain('Showing all 214');
    expect(html).not.toContain('Load more');
  });
});

describe('MissingValue', () => {
  it('shows a dash and reads a label', () => {
    const html = render(<MissingValue label="No peak rating yet" />);
    expect(html).toContain('<span aria-hidden="true">—</span>');
    expect(html).toContain('<span class="sr-only">No peak rating yet</span>');
    expect(html).toContain('text-muted-foreground');
  });
});
