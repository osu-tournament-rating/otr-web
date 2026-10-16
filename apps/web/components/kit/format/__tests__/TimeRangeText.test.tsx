import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  TimeRangeText,
  formatTimeRange,
} from '@/components/kit/format/TimeRangeText';

const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('formatTimeRange', () => {
  const start = '2024-07-20T15:42:07Z';
  const end = '2024-07-20T15:45:30Z';

  it('writes two moments on one UTC day as clock times', () => {
    expect(formatTimeRange(start, end)).toBe('15:42 – 15:45 UTC');
    expect(formatTimeRange(start, end, { seconds: true })).toBe(
      '15:42:07 – 15:45:30 UTC'
    );
  });

  it('adds the day when asked', () => {
    expect(formatTimeRange(start, end, { showDate: true })).toBe(
      'Jul 20, 2024, 15:42 – 15:45 UTC'
    );
  });

  it('reads both ends in UTC, whatever zone they arrive in', () => {
    expect(
      formatTimeRange('2024-07-20T10:42:07-05:00', '2024-07-20 15:45:30+00')
    ).toBe('15:42 – 15:45 UTC');
  });

  it('writes full timestamps when the ends fall on different days', () => {
    expect(
      formatTimeRange('2024-07-20T23:58:01Z', '2024-07-21T00:02:10Z', {
        seconds: true,
      })
    ).toBe('Jul 20, 2024, 23:58:01 UTC – Jul 21, 2024, 00:02:10 UTC');
  });

  it('marks an open end', () => {
    expect(formatTimeRange(start, null)).toBe('From Jul 20, 2024, 15:42 UTC');
    expect(formatTimeRange(undefined, end)).toBe(
      'Until Jul 20, 2024, 15:45 UTC'
    );
  });

  it('prints the empty text when both ends are missing or unreadable', () => {
    expect(formatTimeRange(null, 'not a date')).toBe('—');
    expect(formatTimeRange(null, null, { empty: 'Unknown' })).toBe('Unknown');
  });
});

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

  it('mutes the empty text', () => {
    const html = renderToStaticMarkup(
      <TimeRangeText start={null} end={null} />
    );
    expect(html).toContain('text-muted-foreground');
    expect(text(html)).toBe('—');
  });
});
