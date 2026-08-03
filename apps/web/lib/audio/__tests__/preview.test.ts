import { describe, expect, test } from 'bun:test';

import {
  DEFAULT_PREVIEW_VOLUME,
  MAX_PREVIEW_VOLUME,
  clampPreviewVolume,
  formatPreviewTime,
  getAudioPreviewTitle,
  normalizeAudioPreviewTrack,
  sliderPercentToVolume,
  volumeToSliderPercent,
} from '../preview';

describe('audio preview presentation', () => {
  test('formats elapsed preview time', () => {
    expect(formatPreviewTime(0)).toBe('0:00');
    expect(formatPreviewTime(65.9)).toBe('1:05');
    expect(formatPreviewTime(Number.NaN)).toBe('0:00');
  });

  test('normalizes legacy beatmapset ids', () => {
    expect(normalizeAudioPreviewTrack(123)).toEqual({ beatmapsetOsuId: 123 });
  });

  test('builds useful track identity with a safe fallback', () => {
    expect(
      getAudioPreviewTitle({
        beatmapsetOsuId: 123,
        artist: 'Camellia',
        title: 'Exit This Earth’s Atomosphere',
      })
    ).toBe('Camellia – Exit This Earth’s Atomosphere');
    expect(getAudioPreviewTitle({ beatmapsetOsuId: 123 })).toBe(
      'Beatmapset 123'
    );
  });
});

describe('audio preview volume mapping', () => {
  test('presents the default volume as the middle of the slider', () => {
    expect(volumeToSliderPercent(DEFAULT_PREVIEW_VOLUME)).toBe(50);
    expect(sliderPercentToVolume(50)).toBeCloseTo(DEFAULT_PREVIEW_VOLUME, 10);
  });

  test('maps the slider ends to silence and the capped maximum', () => {
    expect(sliderPercentToVolume(0)).toBe(0);
    expect(sliderPercentToVolume(100)).toBe(MAX_PREVIEW_VOLUME);
    expect(volumeToSliderPercent(0)).toBe(0);
    expect(volumeToSliderPercent(MAX_PREVIEW_VOLUME)).toBe(100);
  });

  test('round-trips slider positions without drift', () => {
    for (const percent of [0, 1, 13, 37, 50, 99, 100]) {
      expect(volumeToSliderPercent(sliderPercentToVolume(percent))).toBe(
        percent
      );
    }
  });

  test('clamps volumes outside the supported range', () => {
    expect(clampPreviewVolume(-1)).toBe(0);
    expect(clampPreviewVolume(1)).toBe(MAX_PREVIEW_VOLUME);
    expect(clampPreviewVolume(Number.NaN)).toBe(DEFAULT_PREVIEW_VOLUME);
    expect(clampPreviewVolume(0.2)).toBe(0.2);
  });
});
