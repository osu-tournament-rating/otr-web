import { describe, expect, it } from 'bun:test';
import { VerificationStatus } from '@otr/core/osu';
import { Check } from 'lucide-react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Badge } from '@/components/kit/status/Badge';
import { VerificationStatusBadge } from '@/components/kit/status/VerificationStatusBadge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { formatBadgeCount } from '@/lib/kit/status/count';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>);

/** The class attribute of the first element. */
const rootClass = (html: string) => /class="([^"]*)"/.exec(html)?.[1] ?? '';

describe('Badge', () => {
  it('sets counts in tabular figures', () => {
    for (const count of [3, formatBadgeCount(1_204, 9_999), '99+']) {
      const html = render(
        <Badge variant="solid" tone="primary" size="sm">
          {count}
        </Badge>
      );

      expect(rootClass(html).split(' ')).toContain('tabular-nums');
    }
  });

  it('keeps a count tabular when a screen-reader label follows it', () => {
    // The header's Admin › Reports count.
    const html = render(
      <Badge variant="solid" tone="primary" size="sm">
        {formatBadgeCount(3)}
        <span className="sr-only"> unseen</span>
      </Badge>
    );

    expect(rootClass(html).split(' ')).toContain('tabular-nums');
  });

  it('leaves words in proportional figures', () => {
    // Tabular figures widen Inter's hyphen: "Pre - verified".
    for (const label of ['Pre-verified', 'mania 4K', 'lazer']) {
      expect(rootClass(render(<Badge>{label}</Badge>))).not.toContain(
        'tabular-nums'
      );
    }

    expect(
      rootClass(
        render(
          <Badge tone="success">
            <Check />
            Passed
          </Badge>
        )
      )
    ).not.toContain('tabular-nums');
  });
});

describe('VerificationStatusBadge', () => {
  it('names the status without any figure override', () => {
    const html = render(
      <VerificationStatusBadge status={VerificationStatus.PreVerified} />
    );

    expect(html).toContain('Pre-verified');
    expect(html).not.toContain('tabular-nums');
    expect(html).not.toContain('proportional-nums');
  });
});
