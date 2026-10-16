import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import RouteError from '@/components/error/RouteError';
import SectionError from '@/components/error/SectionError';

const noop = () => {};

describe('RouteError', () => {
  it('is the red status page, announced as an alert', () => {
    const html = renderToStaticMarkup(
      <RouteError title="Leaderboard could not load" retry={noop} />
    );

    expect(html).toContain('data-slot="status-page"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('<h1 class="text-xl font-semibold text-balance">');
    expect(html).toContain('Leaderboard could not load');
    expect(html).toContain(
      'Something went wrong on our side. Try again in a moment.'
    );
    expect(html).toContain('bg-destructive/10');
    expect(html).not.toMatch(/\bcontainer\b|mx-auto/);
  });

  it('puts the way back before Try again, which is the primary button', () => {
    const html = renderToStaticMarkup(
      <RouteError
        title="Beatmap could not load"
        back={{ href: '/beatmaps', label: 'Beatmaps' }}
        retry={noop}
      />
    );

    expect(html).toContain('href="/beatmaps"');
    expect(html.indexOf('Beatmaps</a>')).toBeLessThan(
      html.indexOf('Try again</button>')
    );
    expect(html).toMatch(/data-variant="outline"[^>]*href="\/beatmaps"/);
    expect(html).toMatch(/<button[^>]*data-variant="default"[^>]*>.*Try again/);
  });
});

describe('SectionError', () => {
  it('retries with the kit outline Button', () => {
    const html = renderToStaticMarkup(
      <SectionError title="Tournaments could not load" onRetry={noop} />
    );

    expect(html).toMatch(/<button[^>]*data-variant="outline"[^>]*>.*Try again/);
    expect(html).toContain('type="button"');
  });

  it('disables the button and shows a spinner while retrying', () => {
    const html = renderToStaticMarkup(
      <SectionError
        size="compact"
        title="Rating history could not load"
        retrying
        onRetry={noop}
      />
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('animate-spin');
  });
});
