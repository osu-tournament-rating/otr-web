import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  TimeRangeText,
  formatTimeRange as reexported,
} from '@/components/kit/format/TimeRangeText';
import { formatTimeRange } from '@/lib/kit/format/date';

const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('TimeRangeText', () => {
  it('renders the range without wrapping', () => {
    const html = renderToStaticMarkup(
      <TimeRangeText
        start="2024-07-20T15:42:07Z"
        end="2024-07-20T15:45:30Z"
        seconds
      />
    );
    expect(html).toContain('whitespace-nowrap');
    expect(text(html)).toBe('15:42:07 – 15:45:30 UTC');
  });

  it('adds the day when asked', () => {
    const html = renderToStaticMarkup(
      <TimeRangeText
        start="2024-07-20T15:42:07Z"
        end="2024-07-20T15:45:30Z"
        showDate
      />
    );
    expect(text(html)).toBe('Jul 20, 2024, 15:42 – 15:45 UTC');
  });

  it('lets ends on different days wrap after the dash', () => {
    const start = '2024-07-20T23:58:01Z';
    const end = '2024-07-21T00:02:10Z';
    const html = renderToStaticMarkup(
      <TimeRangeText start={start} end={end} seconds className="text-sm" />
    );

    expect(text(html)).toBe(formatTimeRange(start, end, { seconds: true }));
    expect(html).toStartWith('<span class="text-sm">');
    expect(html).toContain(
      '<span class="whitespace-nowrap">Jul 20, 2024, 23:58:01 UTC –</span> <span class="whitespace-nowrap">'
    );
  });

  it('mutes the empty text', () => {
    const html = renderToStaticMarkup(
      <TimeRangeText start={null} end={null} />
    );
    expect(html).toContain('text-muted-foreground');
    expect(text(html)).toBe('—');
  });

  it('passes extra props to its root', () => {
    const html = renderToStaticMarkup(
      <TimeRangeText
        start="2024-07-20T15:42:07Z"
        end={null}
        data-testid="game-times"
      />
    );
    expect(html).toContain('data-testid="game-times"');
  });

  it('still exports the formatter from its old home', () => {
    expect(reexported).toBe(formatTimeRange);
  });
});
