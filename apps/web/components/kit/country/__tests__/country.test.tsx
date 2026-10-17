import { describe, expect, it } from 'bun:test';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CountryCombobox } from '@/components/kit/country/CountryCombobox';
import { CountryFlag, CountryName } from '@/components/kit/country/CountryFlag';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getCountryOptions } from '@/lib/kit/format/country';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>);

const text = (html: string) => html.replace(/<[^>]+>/g, '');

/** The attributes of the first `<img>`. */
function imageAttributes(html: string): Record<string, string> {
  const tag = /<img\b[^>]*>/.exec(html)?.[0] ?? '';
  return Object.fromEntries(
    [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [
      name,
      value,
    ])
  );
}

describe('CountryFlag', () => {
  it('names the country on tap, hover and focus by default', () => {
    const html = render(<CountryFlag code="AU" />);

    expect(html).toStartWith('<button');
    expect(html).toContain('aria-label="Australia"');
    // The button carries the name, so the image adds none of its own.
    expect(imageAttributes(html).alt).toBe('');
  });

  it('sets both sides in CSS as well as in the attributes', () => {
    // A one-sided resize is what next/image warns about.
    for (const [size, width, height] of [
      ['sm', 16, 11],
      ['md', 21, 14],
    ] as const) {
      const image = imageAttributes(
        render(<CountryFlag code="JP" size={size} tooltip={false} />)
      );
      expect(image.width).toBe(String(width));
      expect(image.height).toBe(String(height));
      expect(image.style).toContain(`width:${width}px`);
      expect(image.style).toContain(`height:${height}px`);
    }
  });

  it('uses the name as alt text without a tooltip', () => {
    const html = render(<CountryFlag code="KR" tooltip={false} />);

    expect(html).toStartWith('<img');
    expect(imageAttributes(html).alt).toBe('South Korea');
  });

  it('hides a decorative flag and adds no button', () => {
    const html = render(<CountryFlag code="KR" decorative />);

    expect(html).not.toContain('<button');
    expect(imageAttributes(html)['aria-hidden']).toBe('true');
    expect(imageAttributes(html).alt).toBe('');
  });

  it('takes the name a server component worked out', () => {
    const html = render(<CountryFlag code="TR" name="Türkiye" />);
    expect(html).toContain('aria-label="Türkiye"');
  });

  it('renders nothing without a code', () => {
    expect(render(<CountryFlag code="" />)).toBe('');
    expect(render(<CountryFlag code={null} />)).toBe('');
  });

  it("shows osu!'s unknown flag for a code with none", () => {
    const html = render(<CountryFlag code="ZZ" tooltip={false} />);
    expect(imageAttributes(html).src).toContain('XX.png');
  });
});

describe('CountryName', () => {
  it('writes the name beside a decorative flag', () => {
    const html = render(<CountryName code="PL" data-testid="country" />);

    expect(html).toContain('data-testid="country"');
    expect(text(html)).toBe('Poland');
    expect(html).not.toContain('<button');
    expect(imageAttributes(html)['aria-hidden']).toBe('true');
  });
});

describe('CountryCombobox', () => {
  const countries = getCountryOptions();

  it('names the chosen country on its button', () => {
    const html = render(
      <CountryCombobox
        value="PL"
        onValueChange={() => {}}
        countries={countries}
        data-testid="country-filter"
      />
    );

    expect(html).toContain('data-testid="country-filter"');
    expect(text(html)).toBe('Poland');
  });

  it('shows the placeholder when nothing is chosen', () => {
    const html = render(
      <CountryCombobox
        value=""
        onValueChange={() => {}}
        countries={countries}
      />
    );
    expect(text(html)).toBe('Any country');
  });

  it('names a chosen code the list does not offer', () => {
    const html = render(
      <CountryCombobox
        value="EU"
        onValueChange={() => {}}
        countries={countries}
      />
    );
    expect(text(html)).toBe('Europe');
  });
});
