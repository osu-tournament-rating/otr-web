import { describe, expect, test } from 'bun:test';

import { encodeCustomId, parseCustomId } from '../custom-id';

describe('custom id', () => {
  test('round trips every segment', () => {
    const id = { view: 'lb', key: '-', ruleset: 0, page: 4, country: 'KR' };
    expect(encodeCustomId(id)).toBe('1:lb:-:0:4:KR');
    expect(parseCustomId(encodeCustomId(id))).toEqual(id);
  });

  test('writes a missing ruleset as a dash', () => {
    expect(
      encodeCustomId({ view: 'tp', key: '512', ruleset: null, page: 1 })
    ).toBe('1:tp:512:-:1');
    expect(parseCustomId('1:tp:512:-:1')).toEqual({
      view: 'tp',
      key: '512',
      ruleset: null,
      page: 1,
    });
  });

  test('rejects another version or a malformed id', () => {
    expect(parseCustomId('2:pt:1:0:2')).toBeNull();
    expect(parseCustomId('1:pt:1:0')).toBeNull();
    expect(parseCustomId('1:pt:1:0:x')).toBeNull();
    expect(parseCustomId('1:pt:1:0:0')).toBeNull();
    expect(parseCustomId('1:pt:1:0:2:KR:extra')).toBeNull();
  });
});
