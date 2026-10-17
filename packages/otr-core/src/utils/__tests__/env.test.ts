import { describe, expect, it } from 'bun:test';

import { optionalEnv } from '../env';

describe('optionalEnv', () => {
  it('treats an unset value as unset', () => {
    expect(optionalEnv(undefined)).toBeUndefined();
  });

  it('treats an empty or whitespace-only value as unset', () => {
    expect(optionalEnv('')).toBeUndefined();
    expect(optionalEnv('   ')).toBeUndefined();
    expect(optionalEnv('\t\n')).toBeUndefined();
  });

  it('returns a set value trimmed', () => {
    expect(optionalEnv('debug')).toBe('debug');
    expect(optionalEnv('  http://web:3000 ')).toBe('http://web:3000');
  });
});
