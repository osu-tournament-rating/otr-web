import { describe, expect, test } from 'bun:test';

import {
  formatPreviewTime,
  getAudioPreviewTitle,
  normalizeAudioPreviewTrack,
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
