import { describe, expect, test } from 'bun:test';
import {
  CALCULATOR_VERSION,
  canUpgradeCalculationVersion,
  MAX_ATTEMPTS,
  readAttributesConfig,
  retryDelayMs,
} from './policy';

describe('attribute processing bounds', () => {
  test('processing is explicitly opt in', () => {
    expect(readAttributesConfig({}).enabled).toBe(false);
  });
  test('retries back off and stop after the persisted attempt budget', () => {
    expect(retryDelayMs(1)).toBe(15_000);
    expect(retryDelayMs(2)).toBe(30_000);
    expect(retryDelayMs(MAX_ATTEMPTS)).toBeNull();
  });
  test('rejects ambiguous storage and unbounded concurrency', () => {
    expect(() =>
      readAttributesConfig({ BEATMAP_ATTRIBUTES_ENABLED: 'true' })
    ).toThrow();
    expect(() =>
      readAttributesConfig({
        BEATMAP_ATTRIBUTES_ENABLED: 'true',
        BEATMAP_ATTRIBUTES_STORAGE: 'local',
        BEATMAP_ATTRIBUTES_LOCAL_DIR: '/tmp/attributes',
        BEATMAP_ATTRIBUTES_CONCURRENCY: '99',
      })
    ).toThrow();
  });
});

test('only older calculator releases are upgraded during mixed worker rollout', () => {
  expect(
    canUpgradeCalculationVersion('rosu-pp-js@4.0.2+duration@1.0.0', 1)
  ).toBe(false);
  expect(
    canUpgradeCalculationVersion('rosu-pp-js@4.0.1+duration@1.1.0', 1)
  ).toBe(false);
  expect(
    canUpgradeCalculationVersion('rosu-pp-js@4.0.1+duration@1.0.0', 2)
  ).toBe(false);
  expect(canUpgradeCalculationVersion('unknown-future-build', 1)).toBe(false);
  expect(
    canUpgradeCalculationVersion('rosu-pp-js@4.0.0+duration@1.0.0', 1)
  ).toBe(true);
  expect(canUpgradeCalculationVersion(CALCULATOR_VERSION, 1)).toBe(false);
});
