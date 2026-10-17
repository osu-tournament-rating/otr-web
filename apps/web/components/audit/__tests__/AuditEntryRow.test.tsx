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
    name: { originalValue: 'a', newValue: 'b' },
    startTime: {
      originalValue: '2026-08-01T00:00:00.000Z',
      newValue: '2026-08-02T00:00:00.000Z',
    },
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

const TOGGLE = 'data-testid="timeline-entry-toggle"';

describe('AuditEntryRow', () => {
  // #887: the actor's name opened the row instead of their profile.
  it('renders the profile link outside every button', () => {
    const html = render();

    expect(html).toContain('href="/players/440"');
    expect(html).toContain(TOGGLE);
    expect(anchorsInsideButtons(html)).toEqual([]);
  });

  it('renders no details toggle without changes', () => {
    const html = render({ changes: null });

    expect(html).toContain('href="/players/440"');
    expect(html).not.toContain(TOGGLE);
    expect(anchorsInsideButtons(html)).toEqual([]);
  });
});
