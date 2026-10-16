import { describe, expect, it } from 'bun:test';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditEntityType, VerificationStatus } from '@otr/core/osu';

import {
  AuditChangeList,
  AuditFieldChange,
} from '@/components/kit/format/AuditFieldChange';
import { DateRangeText } from '@/components/kit/format/DateRangeText';
import { DateText } from '@/components/kit/format/DateText';
import { RatingDelta } from '@/components/kit/format/RatingDelta';
import { RelativeTime } from '@/components/kit/format/RelativeTime';
import { Timestamp } from '@/components/kit/format/Timestamp';
import { TooltipProvider } from '@/components/ui/tooltip';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<TooltipProvider>{node}</TooltipProvider>);

const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('dates', () => {
  it('renders a day as a time element with the UTC date', () => {
    const html = render(<DateText date="2024-07-20T23:30:00-05:00" />);
    expect(html).toContain('<time dateTime="2024-07-21"');
    expect(text(html)).toBe('Jul 21, 2024');
  });

  it('renders a missing day as a muted em dash, or the given text', () => {
    expect(render(<DateText date={null} />)).toContain(
      'class="text-muted-foreground"'
    );
    expect(text(render(<DateText date={null} empty="Unknown" />))).toBe(
      'Unknown'
    );
  });

  it('renders a range', () => {
    expect(
      text(render(<DateRangeText start="2024-07-20" end="2024-08-03" />))
    ).toBe('Jul 20 – Aug 3, 2024');
    expect(render(<DateRangeText start={null} end={null} />)).toContain(
      'text-muted-foreground'
    );
  });

  it('renders a timestamp with its ISO value', () => {
    const html = render(<Timestamp date="2024-07-20 15:42:07+00" seconds />);
    expect(html).toContain('dateTime="2024-07-20T15:42:07.000Z"');
    expect(text(html)).toBe('Jul 20, 2024, 15:42:07 UTC');
  });

  it('renders a relative time against a fixed clock', () => {
    const html = render(
      <RelativeTime date="2024-08-04T14:51:00Z" now="2024-08-04T18:00:00Z" />
    );
    expect(html).toContain('<button');
    expect(html).toContain('dateTime="2024-08-04T14:51:00.000Z"');
    expect(text(html)).toBe('3h ago');
  });
});

describe('RatingDelta', () => {
  it('colours a gain with the success text token', () => {
    const html = render(<RatingDelta value={12.34} />);
    expect(html).toContain('data-direction="up"');
    expect(html).toContain('text-success-foreground');
    expect(html).toContain('aria-hidden="true"');
    expect(text(html)).toBe('+12.3');
  });

  it('colours a loss with the destructive text token', () => {
    const html = render(<RatingDelta value={-4.56} />);
    expect(html).toContain('data-direction="down"');
    expect(html).toContain('text-destructive-foreground');
    expect(text(html)).toBe('−4.6');
  });

  it('mutes a change that rounds to zero', () => {
    const html = render(<RatingDelta value={0.04} />);
    expect(html).toContain('data-direction="flat"');
    expect(html).toContain('text-muted-foreground');
    expect(text(html)).toBe('0.0');
  });

  it('swaps the colours, not the arrow, when lower is better', () => {
    const html = render(<RatingDelta value={-6.2} lowerIsBetter />);
    expect(html).toContain('data-direction="down"');
    expect(html).toContain('text-success-foreground');
  });

  it('never draws a pill', () => {
    const html = render(<RatingDelta value={20} />);
    expect(html).not.toMatch(/\bbg-|rounded/);
  });
});

describe('AuditFieldChange', () => {
  it('labels the field and strikes the old value through', () => {
    const html = render(
      <AuditChangeList>
        <AuditFieldChange
          entityType={AuditEntityType.Game}
          field="mods"
          change={{ originalValue: 24, newValue: 8 }}
        />
      </AuditChangeList>
    );

    expect(html).toStartWith('<dl');
    expect(html).toContain(
      '<dt class="text-xs font-medium text-muted-foreground">Mods</dt>'
    );
    expect(html).toMatch(/<del[^>]*>HD, HR<\/del>/);
    expect(html).toMatch(/<ins[^>]*>HD<\/ins>/);
    expect(html).toContain('<span class="sr-only">changed to</span>');
  });

  it('reads a missing value as no value', () => {
    const html = render(
      <AuditFieldChange
        entityType={AuditEntityType.Match}
        field="verifiedByUserId"
        change={{ originalValue: null, newValue: 12 }}
        users={{ '12': { username: 'Stage' } }}
      />
    );

    expect(html).toContain('<span class="sr-only">No value</span>');
    expect(html).not.toContain('<del');
    expect(html).toMatch(/<ins[^>]*>Stage<\/ins>/);
  });

  it('lets the page replace a value, with the status it carries', () => {
    const html = render(
      <AuditFieldChange
        entityType={AuditEntityType.Match}
        field="verificationStatus"
        change={{
          originalValue: VerificationStatus.PreVerified,
          newValue: VerificationStatus.Verified,
        }}
        renderValue={(value) => `[${value.status}] ${value.text}`}
      />
    );

    expect(html).toContain('[2] Pre-verified');
    expect(html).toContain('[4] Verified');
  });
});
