import { describe, expect, it } from 'bun:test';

import { parseHeroTab } from '../hero-tabs';

const TABS = ['matches', 'beatmaps', 'ratings', 'stats'] as const;

describe('parseHeroTab', () => {
  it('returns a known tab', () => {
    expect(parseHeroTab('ratings', TABS, 'matches')).toBe('ratings');
  });

  it('falls back when the tab is missing', () => {
    expect(parseHeroTab(undefined, TABS, 'matches')).toBe('matches');
    expect(parseHeroTab('', TABS, 'matches')).toBe('matches');
  });

  it('falls back for an unknown or differently cased tab', () => {
    expect(parseHeroTab('players', TABS, 'matches')).toBe('matches');
    expect(parseHeroTab('Ratings', TABS, 'matches')).toBe('matches');
  });

  it('reads the first value of a repeated parameter', () => {
    expect(parseHeroTab(['stats', 'ratings'], TABS, 'matches')).toBe('stats');
    expect(parseHeroTab([], TABS, 'matches')).toBe('matches');
  });

  it('does not match inherited object keys', () => {
    expect(parseHeroTab('toString', TABS, 'matches')).toBe('matches');
  });
});
