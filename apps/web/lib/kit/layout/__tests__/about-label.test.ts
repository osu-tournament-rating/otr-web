import { describe, expect, it } from 'bun:test';

import { aboutLabel, midSentence } from '../about-label';

describe('midSentence', () => {
  it('lower-cases a sentence-case name', () => {
    expect(midSentence('Circle size')).toBe('circle size');
    expect(midSentence('Rating history')).toBe('rating history');
  });

  it('keeps a name that starts with a short form or an osu! term', () => {
    expect(midSentence('HP drain')).toBe('HP drain');
    expect(midSentence('API keys')).toBe('API keys');
    expect(midSentence('osu! player IDs')).toBe('osu! player IDs');
  });
});

describe('aboutLabel', () => {
  it('names the info button the way hand-written names read', () => {
    expect(aboutLabel('Tier breakdown')).toBe('About tier breakdown');
    expect(aboutLabel('Lobby size')).toBe('About lobby size');
    expect(aboutLabel('API keys')).toBe('About API keys');
  });
});
