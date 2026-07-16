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

export function getAudioPreviewTitle(track: AudioPreviewTrack): string {
  if (track.artist && track.title) return `${track.artist} – ${track.title}`;
  if (track.title) return track.title;
  if (track.artist) return track.artist;

  return `Beatmapset ${track.beatmapsetOsuId}`;
}
