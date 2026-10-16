import { describe, expect, it } from 'bun:test';
import { Trophy } from 'lucide-react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import * as BeatmapSection from '@/components/beatmap/BeatmapSection';
import { DetailHero, HeroMetaItem } from '@/components/kit/layout/DetailHero';
import { HeroTabs } from '@/components/kit/layout/HeroTabs';
import { InfoButton } from '@/components/kit/layout/InfoButton';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { RowList, RowListItem } from '@/components/kit/layout/RowList';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { StatTile, StatTileGrid } from '@/components/kit/layout/StatTile';
import { Tile } from '@/components/kit/layout/Tile';
import { Eyebrow, typeScale } from '@/components/kit/layout/Typography';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ROW_HOVER_TINT, ROW_TITLE_HOVER } from '@/lib/kit/tables/row';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>);

describe('BeatmapSection', () => {
  it('re-exports the kit under its old names', () => {
    expect(BeatmapSection.SectionCard).toBe(Panel);
    expect(BeatmapSection.SectionHeader).toBe(SectionHeader);
    expect(BeatmapSection.Tile).toBe(Tile);
    expect(BeatmapSection.Eyebrow).toBe(Eyebrow);
  });
});

describe('Panel', () => {
  it('is a section with the reference surface by default', () => {
    const html = render(<Panel>Body</Panel>);

    expect(html).toStartWith('<section data-slot="panel"');
    expect(html).toContain(
      'overflow-clip rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none'
    );
  });

  it('renders the requested element and merges classes last', () => {
    const html = render(
      <Panel as="article" className="rounded-lg">
        Body
      </Panel>
    );

    expect(html).toStartWith('<article');
    expect(html).toContain('rounded-lg');
    expect(html).not.toContain('rounded-xl');
  });

  it('pads its body by 16px', () => {
    expect(render(<PanelBody />)).toContain('class="p-4"');
  });
});

describe('SectionHeader', () => {
  it('titles the section with an h2 and a muted icon', () => {
    const html = render(<SectionHeader icon={Trophy} title="Leaderboard" />);

    expect(html).toContain(
      '<h2 class="truncate font-semibold">Leaderboard</h2>'
    );
    expect(html).toContain('text-muted-foreground');
    expect(html).not.toContain('text-primary');
  });

  it('takes a heading level and works without an icon', () => {
    const html = render(<SectionHeader title="Recent matches" level={3} />);

    expect(html).toContain('<h3');
    expect(html).not.toContain('<svg');
  });

  it('names its info button after the title', () => {
    const html = render(
      <SectionHeader title="Tier breakdown" infoText="How to read it" />
    );

    expect(html).toContain('aria-label="About Tier breakdown"');
  });

  it('puts meta beside the actions when both are given', () => {
    const html = render(
      <SectionHeader
        title="Leaderboard"
        meta="top 25"
        actions={<button type="button">Full range</button>}
      />
    );

    expect(html.indexOf('top 25')).toBeLessThan(html.indexOf('Full range'));
  });

  it('fits a 32px action inside the 48px strip', () => {
    const html = render(
      <SectionHeader
        title="Leaderboard"
        actions={<button type="button">Full range</button>}
      />
    );

    expect(html).toMatch(/class="-my-1 [^"]*"><button/);
  });
});

describe('Tile', () => {
  it('stacks an interactive tile from the top, where a bare button centres', () => {
    const html = render(
      <Tile asChild interactive>
        <button type="button">Pooled in</button>
      </Tile>
    );

    expect(html).toStartWith('<button');
    expect(html).toMatch(/class="[^"]*\bflex\b[^"]*\bflex-col\b/);
  });

  it('leaves a plain tile as a block', () => {
    expect(render(<Tile>Most used in</Tile>)).not.toContain('flex-col');
  });
});

describe('InfoButton', () => {
  it('is a labelled button around a hidden icon', () => {
    const html = render(
      <InfoButton label="About percentile">Explanation</InfoButton>
    );

    expect(html).toContain(
      '<button type="button" aria-label="About percentile"'
    );
    expect(html).toContain('aria-hidden="true"');
  });
});

describe('PageHeader', () => {
  it('renders the page h1, description, actions and back link', () => {
    const html = render(
      <PageHeader
        icon={Trophy}
        title="Tournaments"
        description="Browse tournaments."
        actions={<button type="button">Submit</button>}
        back={{ href: '/tournaments/1', label: 'Tournament' }}
      />
    );

    expect(html).toStartWith('<header');
    expect(html).toContain(
      `<h1 class="${typeScale.pageTitle} min-w-0 break-words">`
    );
    expect(html).toContain('href="/tournaments/1"');
    expect(html).toContain('Browse tournaments.');
    expect(html).toContain('Submit');
  });
});

describe('PageFrame', () => {
  it('keeps panels 16px apart and adds no padding', () => {
    const html = render(<PageFrame />);

    expect(html).toContain('gap-4');
    expect(html).not.toMatch(/\bp[xy]?-\d/);
  });
});

describe('DetailHero', () => {
  it('is a plain panel without art', () => {
    const html = render(
      <DetailHero
        title="Break The Meta Cup"
        status={<span>Verified</span>}
        meta={<HeroMetaItem icon={Trophy}>1v1</HeroMetaItem>}
      />
    );

    expect(html).toStartWith('<header data-slot="detail-hero"');
    expect(html).toContain('rounded-xl border bg-card');
    expect(html).toContain('Break The Meta Cup</h1>');
    expect(html).not.toContain('bg-black/60');
    expect(html.indexOf('Verified')).toBeLessThan(html.indexOf('1v1'));
  });

  it('lays the title over a matte when there is art', () => {
    const html = render(
      <DetailHero
        title="HAELEQUIN"
        art={<span data-art />}
        adminActions={<button type="button">Admin</button>}
      />
    );

    expect(html).toContain('data-art');
    expect(html).toContain('bg-black/60');
    expect(html).toContain('text-white');
    expect(html).toContain('Admin');
  });

  it('attaches tabs below a divider', () => {
    const html = render(
      <DetailHero title="Match" tabs={<nav aria-label="Match views" />} />
    );

    expect(html).toContain(
      '<div class="border-t"><nav aria-label="Match views">'
    );
  });
});

describe('HeroTabs', () => {
  it('marks the current tab and keeps test ids', () => {
    const html = render(
      <HeroTabs
        aria-label="Tournament views"
        value="beatmaps"
        items={[
          { value: 'matches', label: 'Matches', href: '?tab=matches' },
          {
            value: 'beatmaps',
            label: 'Beatmaps',
            href: '?tab=beatmaps',
            count: '62',
            testId: 'tab-beatmaps',
          },
        ]}
      />
    );

    expect(html).toContain('aria-label="Tournament views"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/data-testid="tab-beatmaps" aria-current="page"/);
    expect(html).toContain('62');
  });
});

describe('StatTile', () => {
  it('renders a term and a definition inside a grid', () => {
    const html = render(
      <StatTileGrid columns={4}>
        <StatTile
          label="Rating"
          value="2,214.8"
          adornment={<span data-tier />}
          sub="Grandmaster II"
        />
      </StatTileGrid>
    );

    expect(html).toStartWith('<dl');
    expect(html).toContain('sm:grid-cols-4');
    expect(html).toMatch(/<dt[^>]*>.*Rating.*<\/dt>/);
    expect(html.indexOf('data-tier')).toBeLessThan(html.indexOf('2,214.8'));
    expect(html).toContain('Grandmaster II');
  });

  it('lets an adornment overhang the value line', () => {
    const html = render(
      <StatTile label="Rating" value="2,215" adornment={<span data-tier />} />
    );

    expect(html).toMatch(/<span class="-my-1 [^"]*"><span data-tier/);
  });

  it('puts the value on the label line in the inline layout', () => {
    const html = render(<StatTile layout="inline" label="AR" value="8.0" />);

    expect(html).toContain('grid-cols-[minmax(0,1fr)_auto]');
    expect(html).not.toContain('col-span-2');
  });

  it('keeps the value at leading-none in both layouts', () => {
    // tailwind-merge drops a leading class that comes before a size class.
    const stacked = render(<StatTile label="Rating" value="2,214.8" />);
    const inline = render(<StatTile layout="inline" label="AR" value="8.0" />);

    expect(stacked).toMatch(/class="[^"]*\btext-xl\b[^"]*\bleading-none\b/);
    expect(inline).toMatch(/class="[^"]*\btext-lg\b[^"]*\bleading-none\b/);
  });
});

describe('RowListItem', () => {
  it('renders a padded row with the standard slots', () => {
    const html = render(
      <RowList>
        <RowListItem
          title="distantmemory"
          description="United States"
          trailing="2,214.8"
        />
      </RowList>
    );

    expect(html).toStartWith('<ul data-slot="row-list" class="divide-y">');
    expect(html).toContain('<li class="px-4 py-3 flex items-center gap-3">');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('hover:bg');
  });

  it('becomes one tinted, named link when given href', () => {
    const html = render(
      <RowListItem
        href="/tournaments/1"
        linkLabel="View Break The Meta Cup"
        title="BTMC"
        description="osu! · 1v1"
      />
    );

    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="/tournaments/1"');
    expect(html).toContain('aria-label="View Break The Meta Cup"');
    expect(html).toContain(ROW_HOVER_TINT);
    expect(html).toContain(ROW_TITLE_HOVER.replaceAll('&', '&amp;'));
    expect(html).toMatch(/data-row-title="true">BTMC</);
  });

  it('marks no row title when the row is not a link', () => {
    const html = render(<RowListItem title="distantmemory" />);

    expect(html).not.toContain('data-row-title');
  });
});
