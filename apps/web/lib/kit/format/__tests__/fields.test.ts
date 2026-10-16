import { describe, expect, it } from 'bun:test';

import {
  FIELD_NAMES,
  fieldLabel,
  type FieldName,
  formatLobbySize,
  formatRankRange,
  humanizeFieldName,
} from '../fields';

const entries = Object.entries(FIELD_NAMES) as Array<[string, FieldName]>;

describe('glossary', () => {
  it('uses the agreed names', () => {
    expect(fieldLabel('lobbySize')).toBe('Lobby size');
    expect(fieldLabel('rankRange')).toBe('Rank range');
    expect(fieldLabel('ruleset')).toBe('Ruleset');
    expect(fieldLabel('starRating', { short: true })).toBe('SR');
    expect(fieldLabel('ruleset', { short: true })).toBe('Ruleset');
  });

  it('writes every label in sentence case', () => {
    for (const [, { label, short }] of entries) {
      for (const name of [label, short].filter(Boolean) as string[]) {
        const rest = name.split(' ').slice(1);
        for (const word of rest) {
          // Later words are lower case unless they are acronyms or IDs.
          expect(
            word === word.toLowerCase() || word === word.toUpperCase()
          ).toBe(true);
        }
      }
    }
  });

  it('never reuses a name, current or legacy, for two fields', () => {
    const owners = new Map<string, string>();
    for (const [key, { label, legacy = [] }] of entries) {
      for (const name of [label, ...legacy]) {
        const normalized = name.toLowerCase();
        expect(owners.get(normalized) ?? key).toBe(key);
        owners.set(normalized, key);
      }
    }
  });

  it('retires the duplicate names the review found', () => {
    expect(FIELD_NAMES.lobbySize.legacy).toContain('Team size');
    expect(FIELD_NAMES.rankRange.legacy).toContain('Rank restriction');
  });
});

describe('formatRankRange', () => {
  it('names an open tournament', () => {
    expect(formatRankRange(1)).toBe('Open rank');
  });

  it('writes a lower bound with separators and a plus', () => {
    expect(formatRankRange(500)).toBe('500+');
    expect(formatRankRange(10000)).toBe('10,000+');
  });

  it('prints the empty text when there is none', () => {
    expect(formatRankRange(null)).toBe('—');
  });
});

describe('formatLobbySize', () => {
  it('writes NvN', () => {
    expect(formatLobbySize(1)).toBe('1v1');
    expect(formatLobbySize(4)).toBe('4v4');
  });

  it('prints the empty text for sizes that cannot be', () => {
    expect(formatLobbySize(0)).toBe('—');
    expect(formatLobbySize(2.5)).toBe('—');
    expect(formatLobbySize(null, { empty: 'Any' })).toBe('Any');
  });
});

describe('humanizeFieldName', () => {
  it('turns raw names into sentence case', () => {
    expect(humanizeFieldName('drainLength')).toBe('Drain length');
    expect(humanizeFieldName('processingStatus')).toBe('Processing status');
    expect(humanizeFieldName('rank_range')).toBe('Rank range');
    expect(humanizeFieldName('name')).toBe('Name');
  });
});
