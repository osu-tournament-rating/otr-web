import { describe, expect, test } from 'bun:test';
import { parseAttributeArguments } from './command';

describe('attribute operator commands', () => {
  test('rejects custom rate and lazer flags outside the MVP', () => {
    for (const flag of [['--clock-rate', '1.25'], ['--lazer']]) {
      expect(() =>
        parseAttributeArguments(['--osu-id', '2785319', ...flag])
      ).toThrow();
    }
  });

  test('accepts a bounded explicit rebuild batch and continuation cursor', () => {
    const { values } = parseAttributeArguments([
      '--batch-size',
      '25',
      '--after-id',
      '100',
      '--recalculate',
    ]);
    expect(values['batch-size']).toBe('25');
    expect(values['after-id']).toBe('100');
    expect(values.recalculate).toBe(true);
  });

  test('rejects unbounded or ambiguous batch requests before connecting', () => {
    for (const args of [
      [],
      ['--batch-size', '0'],
      ['--batch-size', '101'],
      ['--batch-size', '2.5'],
      ['--batch-size', '25', '--after-id', '-1'],
      ['--batch-size', '25', '--osu-id', '1'],
      ['--batch-size', '25', '--inspect'],
      ['--osu-id', '1', '--after-id', '2'],
    ]) {
      expect(() => parseAttributeArguments(args)).toThrow();
    }
  });

  test('preserves raw NC aliases for the shared normalization boundary', () => {
    const { values } = parseAttributeArguments([
      '--osu-id',
      '2785319',
      '--mods',
      '64,512,576',
    ]);
    expect(values.mods).toBe('64,512,576');
  });
});
