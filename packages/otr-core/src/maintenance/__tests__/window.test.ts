import { describe, expect, it } from 'bun:test';

import { isWithinMaintenanceWindow } from '../window';

const at = (hours: number, minutes: number): Date =>
  new Date(Date.UTC(2026, 0, 6, hours, minutes, 0, 0));

describe('isWithinMaintenanceWindow', () => {
  it('returns false just before the window opens (11:44 UTC)', () => {
    expect(isWithinMaintenanceWindow(at(11, 44))).toBe(false);
  });

  it('returns true at the inclusive start (11:45 UTC)', () => {
    expect(isWithinMaintenanceWindow(at(11, 45))).toBe(true);
  });

  it('returns true while the processor runs (12:00 UTC)', () => {
    expect(isWithinMaintenanceWindow(at(12, 0))).toBe(true);
  });

  it('returns true at the last covered minute (12:14 UTC)', () => {
    expect(isWithinMaintenanceWindow(at(12, 14))).toBe(true);
  });

  it('returns false at the exclusive end (12:15 UTC)', () => {
    expect(isWithinMaintenanceWindow(at(12, 15))).toBe(false);
  });

  it('returns false at an unrelated time of day (00:00 UTC)', () => {
    expect(isWithinMaintenanceWindow(at(0, 0))).toBe(false);
  });

  it('returns false at the maintenance time on a non-Tuesday', () => {
    expect(isWithinMaintenanceWindow(new Date('2026-01-07T12:00:00Z'))).toBe(
      false
    );
  });

  it('evaluates against UTC regardless of local offset', () => {
    // 11:50 UTC on a Tuesday expressed via an explicit UTC timestamp.
    expect(isWithinMaintenanceWindow(new Date('2026-01-06T11:50:00Z'))).toBe(
      true
    );
    expect(isWithinMaintenanceWindow(new Date('2026-01-06T13:50:00Z'))).toBe(
      false
    );
  });
});
