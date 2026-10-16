import { describe, expect, it, mock } from 'bun:test';
import { Ruleset } from '@otr/core/osu';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Bun loads SVG imports as file paths, which React cannot render.
mock.module('@/components/icons/RulesetIcon', () => ({
  default: ({ ruleset }: { ruleset: number | 'all' }) => (
    <svg data-ruleset={ruleset} />
  ),
}));

const { TooltipProvider } = await import('@/components/ui/tooltip');
const { ActiveFilterChips } =
  await import('@/components/kit/lists/ActiveFilterChips');
const { ChoiceChip } = await import('@/components/kit/lists/ChoiceChip');
const { Calendar } = await import('@/components/kit/lists/DateField');
const { DayRangeFilter } =
  await import('@/components/kit/lists/DayRangeFilter');
const { FilterButton } = await import('@/components/kit/lists/FilterButton');
const { ChoiceFilter, FilterPanelContent, SwitchFilter } =
  await import('@/components/kit/lists/FilterPanel');
const { ListToolbar } = await import('@/components/kit/lists/ListToolbar');
const { RangeFilter } = await import('@/components/kit/lists/RangeFilter');
const { RulesetChips } = await import('@/components/kit/lists/RulesetChips');
const { RulesetSwitch } = await import('@/components/kit/lists/RulesetSwitch');
const { ScopeSwitch } = await import('@/components/kit/lists/ScopeSwitch');
const { SearchField } = await import('@/components/kit/lists/SearchField');
const { SortControl } = await import('@/components/kit/lists/SortControl');

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>);

const text = (html: string) => html.replace(/<[^>]+>/g, '');

const noop = () => {};

describe('ListToolbar', () => {
  it('is a named search landmark that renders only the slots it gets', () => {
    const html = render(
      <ListToolbar
        label="Search and filter tournaments"
        search={<span>search-slot</span>}
        count="1,204 tournaments"
      />
    );
    expect(html).toContain('role="search"');
    expect(html).toContain('aria-label="Search and filter tournaments"');
    expect(html).toContain('search-slot');
    expect(html).toContain('aria-live="polite"');
    expect(text(html)).toContain('1,204 tournaments');
    expect(html).not.toContain('border-t pt-3');
  });

  it('hides the active-filter row when its content renders nothing', () => {
    const html = render(
      <ListToolbar
        label="Lists"
        activeFilters={<ActiveFilterChips filters={[]} onClearAll={noop} />}
      />
    );
    expect(html).toContain('empty:hidden');
    expect(html).toContain('<div class="border-t pt-3 empty:hidden"></div>');
  });
});

describe('SearchField', () => {
  it('has an accessible name and no hint for an empty box', () => {
    const html = render(
      <SearchField label="Search tournaments" value="" onSearch={noop} />
    );
    expect(html).toContain('type="search"');
    expect(html).toContain('aria-label="Search tournaments"');
    expect(html).not.toContain('aria-describedby');
    expect(html).not.toContain('Clear search');
  });

  it('explains the minimum length and offers a clear button', () => {
    const html = render(
      <SearchField label="Search tournaments" value="c" onSearch={noop} />
    );
    expect(text(html)).toContain('Type at least 2 characters to search.');
    expect(html).toContain('aria-describedby=');
    expect(html).toMatch(
      /data-slot="icon-button"[^>]*aria-label="Clear search"/
    );
  });
});

describe('SortControl', () => {
  it('names the dropdown and the direction in plain words', () => {
    const html = render(
      <SortControl
        label="Sort tournaments by"
        value={{ key: 'endTime', direction: 'desc' }}
        onValueChange={noop}
        options={[
          {
            value: 'endTime',
            label: 'Completion date',
            directionLabels: { asc: 'Oldest first', desc: 'Newest first' },
          },
          { value: 'startTime', label: 'Start date' },
        ]}
      />
    );
    expect(html).toContain('aria-label="Sort tournaments by"');
    expect(html).toContain('aria-label="Sort order is descending"');
    // The direction is a 40px IconButton, the toolbar's first-row height.
    expect(html).toMatch(
      /data-slot="icon-button"[^>]*class="[^"]*\bsize-10\b[^"]*"[^>]*aria-label="Sort order/
    );
  });

  it('names an ascending sort', () => {
    const html = render(
      <SortControl
        label="Sort"
        value={{ key: 'startTime', direction: 'asc' }}
        onValueChange={noop}
        options={[{ value: 'startTime', label: 'Start date' }]}
      />
    );
    expect(html).toContain('aria-label="Sort order is ascending"');
  });
});

describe('ruleset controls', () => {
  it('marks All when no ruleset is chosen', () => {
    const html = render(<RulesetChips value={[]} onValueChange={noop} />);
    expect(html).toContain('aria-label="Filter by ruleset"');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(text(html)).toBe('Allosu!taikocatchmania 4Kmania 7K');
  });

  it('presses each chosen ruleset', () => {
    const html = render(
      <RulesetChips
        value={[Ruleset.Taiko, Ruleset.Mania7k]}
        onValueChange={noop}
      />
    );
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
  });

  it('renders the switch as a radio group with one checked ruleset', () => {
    const html = render(
      <RulesetSwitch value={Ruleset.Catch} onValueChange={noop} />
    );
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/role="radio"/g)).toHaveLength(5);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  });
});

describe('ScopeSwitch', () => {
  it('explains a disabled option through an info button', () => {
    const html = render(
      <ScopeSwitch
        label="Players to show"
        value="all"
        onValueChange={noop}
        options={[
          { value: 'all', label: 'All' },
          {
            value: 'friends',
            label: 'Friends',
            disabled: true,
            disabledReason: 'Sync your friends first.',
          },
        ]}
      />
    );
    expect(html).toContain('aria-label="Players to show"');
    expect(html).toContain('aria-label="Why Friends is unavailable"');
    expect(html).toContain('disabled=""');
  });
});

describe('filters', () => {
  it('labels the Filters button with its count', () => {
    expect(render(<FilterButton count={0} />)).toContain(
      'aria-label="Filters"'
    );
    const active = render(<FilterButton count={3} />);
    expect(active).toContain('aria-label="Filters, 3 active"');
    expect(text(active)).toBe('Filters3');
    // The kit Button at lg, level with the search field and sort.
    expect(active).toContain('data-variant="outline"');
    expect(active).toContain('h-10');
  });

  it('disables Clear all when nothing is active', () => {
    const html = render(
      <FilterPanelContent
        title="Filter tournaments"
        activeCount={0}
        onClearAll={noop}
      >
        <span />
      </FilterPanelContent>
    );
    expect(html).toContain('Filter tournaments');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Clear all<\/button>/);
  });

  it('shows range bounds with separators, open ends as Any', () => {
    const html = render(
      <RangeFilter
        label="Rank restriction"
        valueLabel="rank"
        min={1}
        max={1_000_000}
        value={{ min: 1000 }}
        onValueChange={noop}
      />
    );
    expect(html).toContain('aria-label="Minimum rank"');
    expect(html).toContain('value="1,000"');
    expect(html).toContain('aria-label="Maximum rank"');
    expect(html).toContain('placeholder="Any"');
    // The label wraps; it is never truncated.
    expect(html).not.toContain('truncate');
  });

  it('presses the chosen options of a choice filter', () => {
    const html = render(
      <ChoiceFilter
        label="Lobby size"
        options={[
          { value: 1, label: '1v1' },
          { value: 2, label: '2v2' },
        ]}
        value={[2]}
        onValueChange={noop}
      />
    );
    expect(html).toContain('role="group"');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it('labels a switch filter', () => {
    const html = render(
      <SwitchFilter label="Verified only" checked onCheckedChange={noop} />
    );
    expect(html).toContain('Verified only');
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
  });

  it('picks dates with buttons, never a native date input', () => {
    const html = render(
      <DayRangeFilter
        label="Tournament dates"
        value={{ from: '2024-07-20' }}
        onValueChange={noop}
      />
    );
    expect(html).not.toContain('type="date"');
    expect(html).toContain('aria-label="From: Jul 20, 2024"');
    expect(html).toContain('aria-label="Through: Any date"');
  });

  it('opens a calendar on the chosen day, and ignores values that are not days', () => {
    const html = render(<Calendar value="2024-07-20" onSelect={noop} />);
    expect(html).toContain('aria-label="Saturday, July 20, 2024"');
    expect(html).toMatch(
      /data-slot="icon-button"[^>]*aria-label="Previous month"/
    );
    expect(html).toMatch(/data-slot="icon-button"[^>]*aria-label="Next month"/);
    expect(html).toMatch(
      /aria-selected="true"[^>]*><button[^>]*data-day="2024-07-20"/
    );
    // A timestamp is not a day: the grid falls back to today instead of throwing.
    expect(() =>
      render(
        <Calendar
          value="2024-07-20T15:42:00Z"
          min="not a day"
          onSelect={noop}
        />
      )
    ).not.toThrow();
  });

  it('names each active filter and leaves out empty ones', () => {
    const html = render(
      <ActiveFilterChips
        onClearAll={noop}
        filters={[
          { key: 'sr', label: 'SR: 5 – 7', onRemove: noop },
          { key: 'status', label: '', onRemove: noop },
        ]}
      />
    );
    expect(html).toContain('aria-label="Remove SR: 5 – 7 filter"');
    expect(html.match(/aria-label="Remove /g)).toHaveLength(1);
    // Chips and the ghost sm Clear all share one 32px height.
    expect(html).toContain('min-h-8');
    expect(html).toMatch(
      /<button[^>]*class="[^"]*\bh-8\b[^"]*"[^>]*data-variant="ghost"[^>]*>Clear all<\/button>/
    );
  });

  it('renders a selected chip as a pressed toggle', () => {
    expect(render(<ChoiceChip selected>4v4</ChoiceChip>)).toContain(
      'aria-pressed="true"'
    );
  });
});
