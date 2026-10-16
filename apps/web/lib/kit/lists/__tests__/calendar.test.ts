import { describe, expect, it } from 'bun:test';

import {
  addDays,
  addMonths,
  clampIsoDay,
  daysInMonth,
  endOfWeek,
  formatLongDay,
  getMonthGrid,
  isDayInRange,
  parseIsoDay,
  startOfWeek,
  toIsoDay,
  todayIsoDay,
  weekdayOf,
} from '../calendar';

describe('calendar days', () => {
  it('parses and writes days', () => {
    expect(parseIsoDay('2024-07-20')).toEqual({
      year: 2024,
      month: 7,
      day: 20,
    });
    expect(parseIsoDay('2024-02-30')).toBeNull();
    expect(toIsoDay({ year: 2024, month: 7, day: 5 })).toBe('2024-07-05');
  });

  it('takes today in UTC, not the local zone', () => {
    // 23:30 on Jul 20 in New York is already Jul 21 in UTC.
    expect(todayIsoDay(new Date('2024-07-20T23:30:00-04:00'))).toBe(
      '2024-07-21'
    );
  });

  it('counts days in a month, leap years included', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2024, 12)).toBe(31);
  });

  it('moves by days across months and years', () => {
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('moves by months, keeping the day where it exists', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2024-07-20', -12)).toBe('2023-07-20');
    expect(addMonths('2024-11-15', 3)).toBe('2025-02-15');
    expect(addMonths('2024-01-15', -1)).toBe('2023-12-15');
  });

  it('finds the week around a day, Sunday first', () => {
    expect(weekdayOf('2024-07-20')).toBe(6);
    expect(startOfWeek('2024-07-20')).toBe('2024-07-14');
    expect(endOfWeek('2024-07-14')).toBe('2024-07-20');
  });

  it('lays a month out as six full weeks', () => {
    const grid = getMonthGrid(2024, 7);
    expect(grid).toHaveLength(6);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[0][0]).toBe('2024-06-30');
    expect(grid[0][1]).toBe('2024-07-01');
    expect(grid[5][6]).toBe('2024-08-10');
  });

  it('clamps and checks against bounds', () => {
    expect(clampIsoDay('2024-07-20', '2024-08-01')).toBe('2024-08-01');
    expect(clampIsoDay('2024-07-20', undefined, '2024-07-01')).toBe(
      '2024-07-01'
    );
    expect(clampIsoDay('2024-07-20')).toBe('2024-07-20');
    expect(isDayInRange('2024-07-20', '2024-07-20', '2024-07-20')).toBe(true);
    expect(isDayInRange('2024-07-21', undefined, '2024-07-20')).toBe(false);
  });

  it('names a day in full for screen readers', () => {
    expect(formatLongDay('2024-07-20')).toBe('Saturday, July 20, 2024');
  });
});
