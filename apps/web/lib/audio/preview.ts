/**
 * Ceiling applied to the raw HTMLAudioElement gain. osu! previews are mastered
 * hot, so a full-scale slider drowns out the rest of the user's system audio.
 */
export const MAX_PREVIEW_VOLUME = 0.8;

/** Gain used until the listener picks their own level. Sits mid-slider. */
export const DEFAULT_PREVIEW_VOLUME = MAX_PREVIEW_VOLUME / 2;

export interface AudioPreviewTrack {
  beatmapsetOsuId: number;
  artist?: string;
  title?: string;
  difficulty?: string;
}

export type AudioPreviewSource = AudioPreviewTrack | number;

export function normalizeAudioPreviewTrack(
  source: AudioPreviewSource
): AudioPreviewTrack {
  return typeof source === 'number' ? { beatmapsetOsuId: source } : source;
}

export function formatPreviewTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Constrains a gain to the supported range, falling back to the default when
 * the value is unusable (a corrupted persisted preference, for example).
 */
export function clampPreviewVolume(volume: number): number {
  if (!Number.isFinite(volume)) return DEFAULT_PREVIEW_VOLUME;

  return Math.max(0, Math.min(MAX_PREVIEW_VOLUME, volume));
}

/** Converts a stored gain into the 0-100 position shown on the slider. */
export function volumeToSliderPercent(volume: number): number {
  return Math.round((clampPreviewVolume(volume) / MAX_PREVIEW_VOLUME) * 100);
}

/** Converts a 0-100 slider position into the gain applied to the element. */
export function sliderPercentToVolume(percent: number): number {
  if (!Number.isFinite(percent)) return DEFAULT_PREVIEW_VOLUME;

  return (Math.max(0, Math.min(100, percent)) / 100) * MAX_PREVIEW_VOLUME;
}
