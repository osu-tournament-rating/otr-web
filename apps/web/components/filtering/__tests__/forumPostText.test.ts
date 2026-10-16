import { describe, expect, it } from 'bun:test';

import { getForumPostText } from '../FilterComplianceNotice';

describe('getForumPostText', () => {
  it('keeps the line hosts paste into their forum post', () => {
    expect(getForumPostText(12, '2025-06-30T18:16:28.599Z')).toBe(
      'o!TR Filtering performed at: 2025-06-30 18:16:28 UTC (Report ID: 12)'
    );
  });

  it('reads the timestamp Postgres stores', () => {
    expect(getForumPostText(1, '2025-06-30 18:16:28.599474+00')).toBe(
      'o!TR Filtering performed at: 2025-06-30 18:16:28 UTC (Report ID: 1)'
    );
  });
});
