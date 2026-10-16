/**
 * Calendar arithmetic on `YYYY-MM-DD` days in UTC, for the date field. Days
 * stay strings so they match the URL and never shift with the visitor's zone.
 */

import { isIsoDay } from './params';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Sunday first, as en-US calendars are. */
export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export interface DayParts {
  year: number;
  /** 1–12. */
  month: number;
  day: number;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function toIsoDay({ year, month, day }: DayParts): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function parseIsoDay(value: string | null | undefined): DayParts | null {
  if (!isIsoDay(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function fromUtc(date: Date): string {
  return toIsoDay({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

function toUtc({ year, month, day }: DayParts): Date {
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC maps years 0–99 onto 1900–1999.
  date.setUTCFullYear(year);
  return date;
}

/** Today in UTC, the same day the site's dates are written in. */
export function todayIsoDay(now: Date = new Date()): string {
  return fromUtc(now);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(day: string, amount: number): string {
  const parts = parseIsoDay(day);
  if (!parts) return day;
  const date = toUtc(parts);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromUtc(date);
}

/** Moves by whole months, keeping the day where it exists (Jan 31 + 1 → Feb 28). */
export function addMonths(day: string, amount: number): string {
  const parts = parseIsoDay(day);
  if (!parts) return day;
  const index = parts.year * 12 + (parts.month - 1) + amount;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return toIsoDay({
    year,
    month,
    day: Math.min(parts.day, daysInMonth(year, month)),
  });
}

/** 0 for Sunday through 6 for Saturday. */
export function weekdayOf(day: string): number {
  const parts = parseIsoDay(day);
  return parts ? toUtc(parts).getUTCDay() : 0;
}

export function startOfWeek(day: string): string {
  return addDays(day, -weekdayOf(day));
}

export function endOfWeek(day: string): string {
  return addDays(day, 6 - weekdayOf(day));
}

/**
 * The month's days as six Sunday-first weeks, padded with days from the
 * months either side so the grid never changes height.
 */
export function getMonthGrid(year: number, month: number): string[][] {
  const first = startOfWeek(toIsoDay({ year, month, day: 1 }));
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) =>
      addDays(first, week * 7 + weekday)
    )
  );
}

/** Keeps `day` within `[min, max]`; either bound may be missing. */
export function clampIsoDay(day: string, min?: string, max?: string): string {
  if (min && day < min) return min;
  if (max && day > max) return max;
  return day;
}

export function isDayInRange(day: string, min?: string, max?: string): boolean {
  return (!min || day >= min) && (!max || day <= max);
}

/** `Saturday, July 20, 2024`: the accessible name of a day in the grid. */
export function formatLongDay(day: string): string {
  const parts = parseIsoDay(day);
  if (!parts) return day;
  return `${WEEKDAY_NAMES[weekdayOf(day)]}, ${MONTH_NAMES[parts.month - 1]} ${parts.day}, ${parts.year}`;
}
