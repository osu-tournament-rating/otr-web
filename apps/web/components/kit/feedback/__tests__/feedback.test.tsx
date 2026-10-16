import { describe, expect, it } from 'bun:test';
import {
  AlertCircle,
  Compass,
  Lock,
  ShieldAlert,
  ShieldQuestion,
} from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import SectionError from '@/components/error/SectionError';
import { Callout } from '@/components/kit/feedback/Callout';
import { CalloutChip } from '@/components/kit/feedback/CalloutChip';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import {
  PanelSkeleton,
  PhoneRowListSkeleton,
  RowListSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
  StatTileGridSkeleton,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { StatusPage } from '@/components/kit/feedback/StatusPage';
import { TooltipProvider } from '@/components/ui/tooltip';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>);

const noop = () => {};

/** The class attribute of the first element matching a tag. */
function classOf(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*class="([^"]*)"`));
  if (!match) throw new Error(`No <${tag}> in ${html}`);
  return match[1];
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('SectionError', () => {
  it('keeps the regular layout for current callers', () => {
    const html = render(
      <SectionError title="Tournaments could not load" onRetry={noop} />
    );

    expect(html).toStartWith(
      '<div role="alert" class="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">'
    );
    expect(html).toContain(
      '<h2 class="text-lg font-semibold">Tournaments could not load</h2>'
    );
    expect(html).toContain(
      'This is temporarily unavailable. Try the request again.'
    );
    expect(html).toContain('h-9 px-4 py-2');
    expect(html).toContain('Try again');
  });

  it('shrinks to compact without a heading or a stock sentence', () => {
    const html = render(
      <SectionError
        size="compact"
        title="Rating history could not load"
        onRetry={noop}
      />
    );

    expect(html).toContain('data-size="compact"');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('<h2');
    expect(html).toContain(
      '<p class="text-sm font-semibold text-balance">Rating history could not load</p>'
    );
    expect(html).not.toContain('temporarily unavailable');
    expect(html).toContain('h-8');
  });

  it('shows a compact description when one is given', () => {
    const html = render(
      <SectionError
        size="compact"
        title="Search failed"
        description="The osu! API is not responding."
        onRetry={noop}
      />
    );

    expect(html).toContain('The osu! API is not responding.');
  });

  it('fits on one line inline', () => {
    const html = render(
      <SectionError
        size="inline"
        title="More tournaments could not load"
        retrying
        onRetry={noop}
        className="justify-center"
      />
    );

    expect(html).toContain('data-size="inline"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('justify-center');
    expect(html).not.toMatch(/<(?:h2|p)[ >]/);
    expect(html).toContain('More tournaments could not load');
    expect(html).toContain('animate-spin');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Try again');
  });
});

describe('EmptyState', () => {
  it('uses the section error frame with a neutral icon', () => {
    const empty = render(
      <EmptyState title="No pooled beatmaps" description="None yet." />
    );
    const error = render(<SectionError title="Failed" onRetry={noop} />);

    expect(classOf(empty, 'div')).toBe(classOf(error, 'div'));
    expect(classOf(empty, 'h2')).toBe(classOf(error, 'h2'));
    expect(classOf(empty, 'p')).toBe(classOf(error, 'p'));
    expect(classOf(empty, 'span')).toContain('size-12');
    expect(classOf(empty, 'span')).toContain('bg-muted');
    expect(empty).toContain('lucide-search-x');
    expect(empty).not.toContain('destructive');
    expect(empty).not.toContain('role="alert"');
  });

  it('adds Clear filters as a link or a button', () => {
    const link = render(
      <EmptyState
        title="No beatmaps match"
        clearFilters={{ href: '/beatmaps?q=freedom' }}
      />
    );
    const button = render(
      <EmptyState title="No beatmaps match" clearFilters={{ onClick: noop }} />
    );

    expect(link).toContain('href="/beatmaps?q=freedom"');
    expect(link).toContain('>Clear filters</a>');
    expect(button).toContain('type="button"');
    expect(button).toContain('>Clear filters</button>');
    // The controls family's outline Button, at the regular size's height.
    expect(link).toContain('data-variant="outline"');
    expect(button).toContain('data-variant="outline"');
    expect(button).toContain('h-9');
  });

  it('renders no action row without actions', () => {
    const html = render(<EmptyState title="No reports" />);

    expect(html).not.toContain('mt-5');
    expect(html).not.toContain('<button');
  });

  it('keeps another action beside Clear filters', () => {
    const html = render(
      <EmptyState
        title="No tournaments match"
        clearFilters={{ href: '/tournaments' }}
        action={<Link href="/tournaments/submit">Submit a tournament</Link>}
      />
    );

    expect(html.indexOf('Clear filters')).toBeLessThan(
      html.indexOf('Submit a tournament')
    );
  });

  it('shrinks to compact with a paragraph title and small buttons', () => {
    const html = render(
      <EmptyState
        size="compact"
        title="Not enough data"
        clearFilters={{ onClick: noop }}
        data-testid="chart-empty"
      />
    );

    expect(html).toContain('data-testid="chart-empty"');
    expect(html).toContain('data-size="compact"');
    expect(html).toContain(
      '<p class="text-sm font-semibold text-balance">Not enough data</p>'
    );
    expect(html).toContain('h-8');
  });

  it('takes a title element', () => {
    const html = render(<EmptyState title="No matches" titleAs="h3" />);
    expect(html).toContain('<h3 class="text-lg font-semibold">No matches</h3>');
  });
});

describe('StatusPage', () => {
  it('is an icon, an h1 and a sentence, with no action unless given', () => {
    const html = render(
      <StatusPage
        icon={Lock}
        title="Unauthorized"
        description="You are not authorized to access this page."
        data-testid="unauthorized-container"
      />
    );

    expect(html).toContain('data-testid="unauthorized-container"');
    expect(html).toContain('<h1 class="text-xl font-semibold text-balance">');
    expect(html).toContain('You are not authorized to access this page.');
    expect(html).toContain('bg-muted');
    expect(html).not.toContain('destructive');
    expect(html).not.toContain('mt-5');
    expect(html).not.toContain('href=');
    expect(classOf(html, 'div')).not.toMatch(/\bcontainer\b|mx-auto/);
  });

  it('holds a route error action: a way back, then Try again', () => {
    const html = render(
      <StatusPage
        icon={AlertCircle}
        tone="destructive"
        title="Tournament could not load"
        description="Something went wrong on our side. Try again in a moment."
        role="alert"
        action={
          <>
            <Link href="/tournaments">Tournaments</Link>
            <button type="button">Try again</button>
          </>
        }
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('mt-5');
    expect(html).toContain('href="/tournaments"');
    expect(html.indexOf('Tournaments</a>')).toBeLessThan(
      html.indexOf('Try again</button>')
    );
  });

  it('puts the background behind the content, hidden from assistive tech', () => {
    const html = render(
      <StatusPage
        icon={Compass}
        title="Page not found"
        background={<span>art</span>}
      />
    );

    expect(html).toContain(
      '<div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10"><span>art</span></div>'
    );
    expect(html).toContain('relative isolate');
  });

  it('turns red for failures and holds details', () => {
    const html = render(
      <StatusPage
        icon={ShieldAlert}
        tone="destructive"
        title="Account suspended"
      >
        <p>Reason: Submissions abuse</p>
      </StatusPage>
    );

    expect(html).toContain('bg-destructive/10');
    expect(html).toContain('text-destructive');
    expect(html).toContain('<p>Reason: Submissions abuse</p>');
    // The detail stays centred with the rest of the page.
    expect(html).not.toContain('text-left');
  });
});

describe('Callout', () => {
  it('colours each tone with its callout tokens and glyph', () => {
    const info = render(<Callout>Ratings update weekly.</Callout>);
    const warning = render(<Callout tone="warning">Check this.</Callout>);
    const danger = render(<Callout tone="danger">No undo.</Callout>);

    expect(info).toContain('bg-callout-info');
    expect(info).toContain('lucide-info');
    expect(warning).toContain('bg-callout-warning');
    expect(warning).toContain('lucide-triangle-alert');
    expect(danger).toContain('bg-callout-danger');
    expect(danger).toContain('lucide-octagon-alert');
    expect(info).not.toContain('role=');
  });

  it('leads with a title and keeps its action out of the tone colour', () => {
    const html = render(
      <Callout
        tone="danger"
        title="Saving is permanent"
        action={<button type="button">Delete account</button>}
      >
        Nothing can undo it.
      </Callout>
    );

    expect(html).toContain('<p class="font-semibold">Saving is permanent</p>');
    expect(html).toMatch(/text-foreground[^"]*"><button/);
  });

  it('takes a custom icon', () => {
    const html = render(
      <Callout icon={ShieldQuestion}>Includes unverified data.</Callout>
    );

    expect(html).toContain('lucide-shield-question');
    expect(html).not.toContain('lucide-info');
  });

  it('spans the page as a banner', () => {
    const html = render(
      <Callout tone="warning" variant="banner" role="status">
        Ratings are recalculating.
      </Callout>
    );

    expect(html).toContain('data-variant="banner"');
    expect(html).toContain('role="status"');
    expect(html).toContain('w-full');
    expect(html).toContain('border-b');
    expect(html).not.toContain('rounded-lg');
  });
});

describe('CalloutChip', () => {
  it('is a rounded badge in the callout colours', () => {
    const html = render(<CalloutChip>Partial data</CalloutChip>);

    expect(html).toStartWith('<span data-slot="callout-chip"');
    expect(html).toContain('rounded-md');
    expect(html).toContain('border-callout-warning-border');
    expect(html).toContain('bg-callout-warning');
    expect(html).toContain('text-callout-warning-foreground');
    expect(html).not.toContain('bg-secondary');
    expect(html).toContain('lucide-triangle-alert');
  });

  it('opens its detail from a button', () => {
    const html = render(
      <CalloutChip tone="info" detail="Fetched 2 hours ago">
        Cached
      </CalloutChip>
    );

    expect(html).toStartWith('<button');
    expect(html).toContain('bg-callout-info');
  });
});

describe('Skeletons', () => {
  it('announces a loading panel once', () => {
    const html = render(<PanelSkeleton label="Loading reports" />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading reports"');
    expect(html).toContain('rounded-xl border bg-card');
    expect(html).toContain('data-slot="section-header-skeleton"');
  });

  it('draws a real section header when the title is known', () => {
    const html = render(<SectionHeaderSkeleton title="Reports" level={3} />);

    expect(html).toContain('data-slot="section-header"');
    expect(html).toContain('<h3 class="truncate font-semibold">Reports</h3>');
    expect(html).toContain('data-slot="skeleton"');
  });

  it('keeps stat tile labels and bars the values', () => {
    const html = render(
      <StatTileGridSkeleton labels={['Rating', 'Matches']} columns={2} sub />
    );

    expect(html).toContain('data-slot="stat-tile-grid"');
    expect(html).toContain('Rating');
    expect(html).toContain('Matches');
    expect(count(html, 'data-slot="tile"')).toBe(2);
    expect(count(html, 'data-slot="skeleton"')).toBe(4);
  });

  it('keeps the value bar under the 20px value line', () => {
    const html = render(<StatTileGridSkeleton labels={['Rating']} />);

    expect(html).toContain('w-20');
    expect(html).not.toContain('h-5');
  });

  it('draws the DataTable header strip and rows', () => {
    const html = render(
      <TableSkeleton
        rows={3}
        columns={[
          { label: 'Type', width: 'w-24' },
          { label: 'Reason', showFrom: 'lg' },
          { label: 'Submitted', width: 'w-40', align: 'end' },
        ]}
      />
    );

    expect(html).toContain('data-slot="table-skeleton"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('table-fixed');
    expect(html).toContain('[&amp;_tr]:bg-muted');
    expect(html).toMatch(
      /<th[^>]*class="[^"]*\bh-8\b[^"]*\bw-24\b[^"]*">Type<\/th>/
    );
    expect(count(html, 'hidden lg:table-cell')).toBe(4);
    expect(html).toContain('justify-end');
    expect(count(html, '<tr')).toBe(4);
    expect(count(html, 'flex items-center h-6')).toBe(6);
    expect(count(html, 'data-slot="skeleton"')).toBe(9);
  });

  it('sizes table rows by the loaded cell content', () => {
    const html = render(
      <TableSkeleton rows={1} columns={2} cellHeight="h-9" />
    );

    expect(count(html, ' h-9')).toBe(2);
    expect(html).not.toContain(' h-6');
  });

  it('swaps a table for phone rows below tablet width', () => {
    const html = render(
      <TableSkeleton
        rows={2}
        columns={3}
        phoneRows={<PhoneRowListSkeleton rows={2} rank avatar />}
      />
    );

    expect(html).toContain('hidden md:block');
    expect(html).toContain('class="md:hidden"');
    expect(html).toContain('data-slot="phone-row-list-skeleton"');
    expect(count(html, 'data-slot="phone-row"')).toBe(2);
  });

  it('draws phone rows with the parts asked for', () => {
    const plain = render(<PhoneRowListSkeleton rows={3} />);
    const full = render(
      <PhoneRowListSkeleton rows={1} rank avatar valueDescription />
    );

    expect(count(plain, 'data-slot="phone-row"')).toBe(3);
    expect(plain).not.toContain('rounded-full');
    // Title, description and value per row.
    expect(count(plain, 'data-slot="skeleton"')).toBe(9);
    expect(full).toContain('size-6');
    expect(full).toContain('col-start-1');
    // Rank, avatar, title, description, value and its line.
    expect(count(full, 'data-slot="skeleton"')).toBe(6);
  });

  it('draws list rows in the RowList', () => {
    const html = render(<RowListSkeleton rows={2} leading="none" />);

    expect(html).toStartWith('<ul data-slot="row-list-skeleton"');
    expect(count(html, '<li')).toBe(2);
    expect(html).not.toContain('rounded-full');
  });

  it('stands in for text inline', () => {
    const html = render(<SkeletonText className="w-72" />);

    expect(html).toStartWith('<span data-slot="skeleton" aria-hidden="true"');
    expect(html).toContain('inline-block');
    expect(html).toContain('w-72');
    expect(html).not.toContain('w-24');
  });
});
