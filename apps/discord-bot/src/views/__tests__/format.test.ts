import { describe, expect, test } from 'bun:test';

import {
  ago,
  date,
  tournamentAge,
  histogram,
  hourWindow,
  modRows,
  signed,
  scoreThousands,
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
    const later = hoursOf({ 22: 5, 23: 5, 0: 5, 1: 5, 2: 5, 12: 1 });
    expect(hourWindow(later)).toMatchObject({ start: 22, end: 3 });
  });

  test('a window that ends at midnight reads 24, never 0', () => {
    const hours = hoursOf({ 16: 5, 17: 5, 18: 5, 19: 5, 4: 1 });
    expect(hourWindow(hours)).toMatchObject({ start: 16, end: 20 });
    const late = hoursOf({ 21: 5, 22: 5, 23: 5, 4: 1 });
    expect(hourWindow(late)).toMatchObject({ start: 21, end: 24 });
    const one = hoursOf({ 23: 5, 4: 1 });
    expect(hourWindow(one)).toMatchObject({ start: 23, end: 24 });
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

test('a counted row keeps one pip', () => {
  expect(
    histogram([
      { label: 'NM', count: 650, share: 0.4 },
      { label: 'HDHR', count: 21, share: 0.013 },
    ])
  ).toBe('```\nNM    40%  650  ▰▰▰▰▰▰▰\nHDHR   1%   21  ▰▱▱▱▱▱▱\n```');
});

describe('tournamentAge', () => {
  test.each([
    ['2026-02-28T00:00:00.001Z', '0d ago'],
    ['2026-02-28T00:00:00Z', '1d ago'],
    ['2026-02-03T00:00:00Z', '26d ago'],
    ['2025-03-01T00:00:00Z', '1y ago'],
    ['2026-03-01T00:00:00Z', '0d ago'],
    ['2026-03-01T00:00:01Z', 'Not started'],
    [null, 'Start date unknown'],
    ['invalid', 'Start date unknown'],
    ['2026-02-28T19:00:00-05:00', '0d ago'],
  ])('%s reads %s', (iso, expected) => {
    expect(tournamentAge(iso, now)).toBe(expected);
  });
});

test('mod rows merge display-equivalent mods and keep shares against all plays', () => {
  expect(
    modRows([
      { mods: 0, count: 60 },
      { mods: 1, count: 39 },
      { mods: 8, count: 1 },
      { mods: 16, count: 0 },
    ])
  ).toEqual([
    { label: 'NM', count: 99, share: 0.99 },
    { label: 'HD', count: 1, share: 0.01 },
  ]);
  expect(
    modRows([
      { mods: 0, count: 199 },
      { mods: 8, count: 1 },
    ])
  ).toEqual([{ label: 'NM', count: 199, share: 0.995 }]);
  expect(modRows([])).toEqual([]);
});

describe('scoreThousands', () => {
  test.each([
    [0, '0'],
    [1, '1'],
    [999, '999'],
    [1000, '1k'],
    [1999, '1k'],
    [456789, '456k'],
    [999999, '999k'],
    [1000000, '1000k'],
    [1234567, '1234k'],
  ])('%i reads %s', (value, expected) => {
    expect(scoreThousands(value)).toBe(expected);
  });
});

test.each([
  [29, '29d ago'],
  [30, '1mo ago'],
  [59, '1mo ago'],
  [60, '2mo ago'],
  [364, '12mo ago'],
  [365, '1y ago'],
  [729, '1y ago'],
  [730, '2y ago'],
])('tournament age at %i elapsed days', (days, label) => {
  expect(
    tournamentAge(new Date(now - days * 86400000).toISOString(), now)
  ).toBe(label);
});
