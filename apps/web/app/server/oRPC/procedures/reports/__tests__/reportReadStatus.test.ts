import { describe, expect, it } from 'bun:test';

import { hasUnreadAdminUpdate } from '../reportReadStatus';

describe('hasUnreadAdminUpdate', () => {
  it('returns false for a report that has not been resolved', () => {
    expect(
      hasUnreadAdminUpdate({ resolvedAt: null, reporterViewedAt: null })
    ).toBe(false);
  });

  it('returns false for an unresolved report even if previously viewed', () => {
    expect(
      hasUnreadAdminUpdate({
        resolvedAt: null,
        reporterViewedAt: '2026-06-20T12:00:00Z',
      })
    ).toBe(false);
  });

  it('returns true when resolved and never viewed', () => {
    expect(
      hasUnreadAdminUpdate({
        resolvedAt: '2026-06-20T12:00:00Z',
        reporterViewedAt: null,
      })
    ).toBe(true);
  });

  it('returns true when the resolution is newer than the last view', () => {
    expect(
      hasUnreadAdminUpdate({
        resolvedAt: '2026-06-20T12:00:00Z',
        reporterViewedAt: '2026-06-20T11:59:59Z',
      })
    ).toBe(true);
  });

  it('returns false when the report was viewed at or after the resolution', () => {
    expect(
      hasUnreadAdminUpdate({
        resolvedAt: '2026-06-20T12:00:00Z',
        reporterViewedAt: '2026-06-20T12:00:00Z',
      })
    ).toBe(false);

    expect(
      hasUnreadAdminUpdate({
        resolvedAt: '2026-06-20T12:00:00Z',
        reporterViewedAt: '2026-06-20T12:00:01Z',
      })
    ).toBe(false);
  });

  it('accepts Date instances as well as ISO strings', () => {
    expect(
      hasUnreadAdminUpdate({
        resolvedAt: new Date('2026-06-20T12:00:00Z'),
        reporterViewedAt: new Date('2026-06-20T11:00:00Z'),
      })
    ).toBe(true);
  });
});
