import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';

import type { AuditEntry } from '@/lib/orpc/schema/audit';
import { TooltipProvider } from '@/components/ui/tooltip';
import AuditEntryRow from '../AuditEntryRow';

const entry: AuditEntry = {
  id: 1,
  entityType: AuditEntityType.Match,
  referenceIdLock: 29473,
  referenceId: 29473,
  actionUserId: 7,
  actionType: AuditActionType.Updated,
  changes: {
    verificationStatus: { originalValue: 0, newValue: 4 },
    name: { originalValue: 'a', newValue: 'b' },
  },
  created: '2026-09-01T00:00:00.000Z',
  actionUser: { id: 7, playerId: 440, osuId: null, username: 'Cytusine' },
};

const render = (props: Partial<AuditEntry> = {}) =>
  renderToStaticMarkup(
    <TooltipProvider>
      <AuditEntryRow entry={{ ...entry, ...props }} />
    </TooltipProvider>
  );

/** Anchors that open while a `<button>` is still open. */
const anchorsInsideButtons = (html: string) =>
  [...html.matchAll(/<button[^>]*>[\s\S]*?<\/button>/g)].filter((m) =>
    /<a\s/.test(m[0])
  );

describe('AuditEntryRow', () => {
  it('renders the profile link outside the disclosure button', () => {
    const html = render();

    expect(html).toContain('href="/players/440"');
    expect(anchorsInsideButtons(html)).toEqual([]);
  });

  it('names the disclosure button by its change count', () => {
    const html = render();
    const button = html.match(/<button[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';

    expect(button).toContain('aria-expanded=');
    expect(button.replace(/<[^>]+>/g, '').trim()).toBe('2 fields changed');
  });

  it('renders no disclosure button without changes', () => {
    const html = render({ changes: null });

    expect(html).not.toContain('<button');
    expect(html).toContain('href="/players/440"');
  });
});
