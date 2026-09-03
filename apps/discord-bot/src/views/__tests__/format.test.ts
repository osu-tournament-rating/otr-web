import { describe, expect, test } from 'bun:test';

import {
  ago,
  date,
  histogram,
  hourWindow,
  signed,
  tournamentDelta,
} from '../format';

const now = Date.parse('2026-03-01T00:00:00Z');
const hoursOf = (counts: Record<number, number>) =>
  Object.entries(counts).flatMap(([hour, count]) =>
    Array.from({ length: count }, () => Number(hour))
  );

describe('ago', () => {
  test.each([
    ['2023-02-01T00:00:00Z', '3y ago'],
    ['2026-01-01T00:00:00Z', '1mo ago'],
    ['2026-02-24T00:00:00Z', '5d ago'],
    ['2026-02-28T21:00:00Z', '3h ago'],
    ['2026-02-28T23:55:00Z', '5m ago'],
    ['2026-02-28T23:59:30Z', 'now'],
    ['2026-03-01T00:00:10Z', 'now'],
  ])('%s reads %s', (iso, expected) => {
    expect(ago(iso, now)).toBe(expected);
  });
});

test('date reads the UTC calendar day', () => {
  expect(date('2023-04-29T23:30:00Z')).toBe('2023-04-29');
});

test('signed rounds and uses the typographic minus', () => {
  expect(signed(4.2)).toBe('+4');
  expect(signed(-16.6)).toBe('−17');
  expect(signed(-0.4)).toBe('+0');
});

describe('hourWindow', () => {
  test('takes the shortest run that covers 80 percent', () => {
    const hours = hoursOf({ 13: 10, 14: 10, 18: 10, 22: 1, 3: 1 });
    expect(hourWindow(hours)).toMatchObject({ start: 13, end: 19 });
  });

  test('wraps past midnight', () => {
    const hours = hoursOf({ 22: 5, 23: 5, 0: 5, 1: 5, 12: 1 });
    expect(hourWindow(hours)).toMatchObject({ start: 22, end: 2 });
  });

  test('takes the earliest start when two runs tie', () => {
    const hours = hoursOf({ 2: 5, 3: 5, 14: 5, 15: 5 });
    expect(hourWindow(hours, 0.5)).toMatchObject({ start: 2, end: 4 });
  });

  test('reports the covered share', () => {
    const hours = hoursOf({ 13: 5, 14: 1, 20: 1 });
    expect(hourWindow(hours)?.share).toBeCloseTo(6 / 7);
  });

  test('needs three hours', () => {
    expect(hourWindow([13, 14])).toBeNull();
    expect(hourWindow([])).toBeNull();
  });
});

test('tournamentDelta sums the matches of one tournament', () => {
  const adjustments = [
    { ratingDelta: 12, match: { tournamentId: 512 } },
    { ratingDelta: -30, match: { tournamentId: 512 } },
    { ratingDelta: 99, match: { tournamentId: 513 } },
    { ratingDelta: 7, match: null },
  ];
  expect(tournamentDelta(adjustments, 512)).toBe(-18);
  expect(tournamentDelta(adjustments, 999)).toBe(0);
});

test('histogram scales the bar to the top row', () => {
  const counts: [string, number][] = [
    ['NM', 61],
    ['DT', 56],
    ['HR', 54],
    ['HD', 7],
  ];
  expect(
    histogram(
      counts.map(([label, count]) => ({ label, count, share: count / 178 }))
    )
  ).toBe(
    '```\nNM  34%  61  ▰▰▰▰▰▰▰\nDT  31%  56  ▰▰▰▰▰▰▱\nHR  30%  54  ▰▰▰▰▰▰▱\nHD   4%   7  ▰▱▱▱▱▱▱\n```'
  );
});
