import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  MAINTENANCE_NOTICE,
  SIGNED_OUT_NOTICE,
  SiteBannerContent,
} from '@/components/banner/SiteBanner';

const render = (maintenance: boolean, signedIn: boolean) =>
  renderToStaticMarkup(
    <SiteBannerContent maintenance={maintenance} signedIn={signedIn} />
  );

const count = (html: string, text: string) => html.split(text).length - 1;

describe('SiteBannerContent', () => {
  it('shows nothing to a signed-in visitor outside the window', () => {
    expect(render(false, true)).toBe('');
  });

  it('shows the signed-out note outside the window', () => {
    const html = render(false, false);

    expect(html).toContain('data-testid="signed-out-notice"');
    expect(html).toContain(SIGNED_OUT_NOTICE);
    expect(html).toContain('data-tone="info"');
    expect(html).not.toContain(MAINTENANCE_NOTICE);
  });

  it('shows only the maintenance warning to a signed-in visitor', () => {
    const html = render(true, true);

    expect(html).toContain('data-testid="maintenance-window-banner"');
    expect(html).toContain('role="status"');
    expect(html).toContain(MAINTENANCE_NOTICE);
    expect(html).not.toContain(SIGNED_OUT_NOTICE);
  });

  it('puts both notices in one strip for a signed-out visitor in the window', () => {
    const html = render(true, false);

    expect(count(html, 'data-slot="callout"')).toBe(1);
    expect(html).toContain('data-tone="warning"');
    expect(html).toContain('data-testid="maintenance-window-banner"');
    expect(html).toContain('data-testid="signed-out-notice"');
    expect(html).toContain(`${MAINTENANCE_NOTICE}. `);
    expect(html).toContain(SIGNED_OUT_NOTICE);
  });
});
