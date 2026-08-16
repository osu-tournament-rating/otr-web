import { describe, expect, it } from 'bun:test';

import { SLIDER_MAX, linearScale, tieredScale } from '../scale';

describe('linearScale', () => {
  const sr = linearScale({ min: 0, max: 15, step: 0.1 });

  it('snaps to the step grid without float dust', () => {
    // 71 * 0.1 is 7.1000000000000005 and 3 * 0.1 is 0.30000000000000004, so
    // the snapped value has to be re-rounded to the step's decimal count.
    expect(sr.snap(7.1)).toBe(7.1);
    expect(Object.is(sr.snap(7.1), 7.1000000000000005)).toBe(false);
    expect(sr.snap(0.3)).toBe(0.3);
    expect(sr.snap(2.9)).toBe(2.9);
    expect(sr.snap(7.04)).toBe(7);
    // Exact halves resolve upward, matching the tiered scale.
    expect(sr.snap(7.05)).toBe(7.1);
    expect(sr.step(6.9, 1)).toBe(7);
    expect(sr.step(7, 1)).toBe(7.1);
    expect(sr.step(0.2, 1)).toBe(0.3);
  });

  it('clamps to the bounds', () => {
    expect(sr.snap(-4)).toBe(0);
    expect(sr.snap(99)).toBe(15);
    expect(sr.snap(Number.NaN)).toBe(0);
  });

  it('maps positions proportionally', () => {
    expect(sr.toPosition(0)).toBe(0);
    expect(sr.toPosition(7.5)).toBe(50);
    expect(sr.toPosition(15)).toBe(SLIDER_MAX);
    expect(sr.fromPosition(50)).toBe(7.5);
    expect(sr.fromPosition(-10)).toBe(0);
    expect(sr.fromPosition(1_000)).toBe(15);
  });

  it('round-trips values on the grid', () => {
    for (const value of [0, 0.1, 4.2, 7.5, 12.9, 15]) {
      expect(sr.fromPosition(sr.toPosition(value))).toBe(value);
    }
  });

  it('moves whole steps by keyboard and clamps at the ends', () => {
    expect(sr.step(7.5, 10)).toBe(8.5);
    expect(sr.step(7.5, -10)).toBe(6.5);
    expect(sr.step(0, -1)).toBe(0);
    expect(sr.step(15, 1)).toBe(15);
    expect(sr.step(7.53, 0)).toBe(7.5);
  });

  it('defaults to a step of 1 and handles integer domains', () => {
    const bpm = linearScale({ min: 0, max: 600 });

    expect(bpm.snap(180.4)).toBe(180);
    expect(bpm.snap(180.6)).toBe(181);
    expect(bpm.toPosition(300)).toBe(50);
    expect(bpm.step(180, 10)).toBe(190);
  });

  it('survives a zero-width domain', () => {
    const flat = linearScale({ min: 5, max: 5 });

    expect(flat.toPosition(5)).toBe(0);
    expect(flat.fromPosition(50)).toBe(5);
  });
});

describe('tieredScale', () => {
  const scale = tieredScale({
    tiers: [
      { start: 0, end: 10, step: 1 },
      { start: 20, end: 100, step: 10 },
    ],
  });

  // Stops: 0..10 (11) then 20..100 (9) = 20 stops, indices 0..19.

  it('exposes the outer stops as bounds', () => {
    expect(scale.min).toBe(0);
    expect(scale.max).toBe(100);
  });

  it('snaps to the nearest stop and resolves ties upward', () => {
    expect(scale.snap(4.4)).toBe(4);
    expect(scale.snap(14)).toBe(10);
    expect(scale.snap(15)).toBe(20);
    expect(scale.snap(24)).toBe(20);
    expect(scale.snap(25)).toBe(30);
    expect(scale.snap(-5)).toBe(0);
    expect(scale.snap(500)).toBe(100);
  });

  it('maps position by stop index, not by numeric width', () => {
    expect(scale.toPosition(0)).toBe(0);
    expect(scale.toPosition(100)).toBe(SLIDER_MAX);
    // Stop 10 sits at index 10 of 19, so just past the midpoint even though it
    // is only a tenth of the numeric range.
    expect(scale.toPosition(10)).toBeCloseTo((10 / 19) * 100, 6);
    expect(scale.fromPosition((10 / 19) * 100)).toBe(10);
  });

  it('round-trips every tier boundary', () => {
    for (const value of [0, 5, 10, 20, 50, 100]) {
      expect(scale.fromPosition(scale.toPosition(value))).toBe(value);
    }
  });

  it('steps one stop at a time across tier boundaries', () => {
    expect(scale.step(9, 1)).toBe(10);
    expect(scale.step(10, 1)).toBe(20);
    expect(scale.step(20, -1)).toBe(10);
    expect(scale.step(20, 1)).toBe(30);
    expect(scale.step(0, -1)).toBe(0);
    expect(scale.step(100, 1)).toBe(100);
    expect(scale.step(4.5, 0)).toBe(5);
  });

  it('moves off-grid values to the adjacent stop', () => {
    expect(scale.step(14, -1)).toBe(10);
    expect(scale.step(14, 1)).toBe(20);
  });

  it('deduplicates stops shared by adjacent tiers', () => {
    const overlapping = tieredScale({
      tiers: [
        { start: 0, end: 10, step: 5 },
        { start: 10, end: 30, step: 10 },
      ],
    });

    // Stops are 0, 5, 10, 20, 30 - the shared 10 appears once.
    expect(overlapping.toPosition(10)).toBe(50);
    expect(overlapping.step(10, 1)).toBe(20);
  });
});
