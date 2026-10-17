import { describe, expect, it } from 'bun:test';

import {
  currentReportCount,
  reportCountOwner,
} from '@/lib/hooks/useReportCount';

describe('currentReportCount', () => {
  const adminCount = { owner: reportCountOwner(7, true), count: 4 };
  const userCount = { owner: reportCountOwner(7, false), count: 2 };

  it('shows the count loaded for this user', () => {
    expect(currentReportCount(adminCount, 7, true)).toBe(4);
    expect(currentReportCount(userCount, 7, false)).toBe(2);
  });

  it('reads 0 once signed out, whatever was loaded before', () => {
    expect(currentReportCount(adminCount, null, true)).toBe(0);
    expect(currentReportCount(userCount, null, false)).toBe(0);
  });

  it('never shows one account or kind of count to another', () => {
    expect(currentReportCount(userCount, 8, false)).toBe(0);
    expect(currentReportCount(userCount, 7, true)).toBe(0);
  });

  it('reads 0 before anything has loaded', () => {
    expect(currentReportCount(undefined, 7, false)).toBe(0);
  });
});
