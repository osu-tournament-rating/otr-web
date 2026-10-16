import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import TierIcon from '@/components/icons/TierIcon';
import { TooltipProvider } from '@/components/ui/tooltip';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>);

describe('TierIcon', () => {
  it('is a plain image named after its tier', () => {
    const html = render(
      <TierIcon tier="Grandmaster" subTier={2} width={20} height={20} />
    );

    expect(html).toMatch(/^<img[^>]*alt="Grandmaster II"/);
    expect(html).not.toContain('<button');
  });

  it('opens its tooltip from a button, so a tap can read the tier', () => {
    const html = render(
      <TierIcon tier="Grandmaster" subTier={2} tooltip width={20} height={20} />
    );

    expect(html).toMatch(/^<button[^>]*aria-label="Tier: Grandmaster II"/);
    expect(html).toContain('aria-haspopup="dialog"');
    // The button carries the name; the image inside is decorative.
    expect(html).toMatch(/<img[^>]*alt=""/);
  });
});
