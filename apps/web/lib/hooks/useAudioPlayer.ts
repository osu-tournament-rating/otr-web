'use client';

import { useCallback, useContext } from 'react';
import { Loader2, Pause, Play, RefreshCw, type LucideIcon } from 'lucide-react';

import {
  AudioPlayerContext,
  AudioPlayerTimeContext,
} from '@/components/audio/AudioPlayerContext';
import type { AudioPreviewTrack } from '@/lib/audio/preview';

export function useAudioPlayer() {
  return useContext(AudioPlayerContext);
}

/** Playback position in seconds; subscribes to ~4Hz timeupdate ticks. */
export function useAudioPlayerTime(): number {
  return useContext(AudioPlayerTimeContext);
}

export type PreviewButtonStatus =
  'loading' | 'playing' | 'error' | 'paused' | 'idle';

export const PREVIEW_STATUS_ICONS: Record<PreviewButtonStatus, LucideIcon> = {
  loading: Loader2,
  playing: Pause,
  error: RefreshCw,
  paused: Play,
  idle: Play,
};

export const PREVIEW_ACTION_LABELS: Record<PreviewButtonStatus, string> = {
  loading: 'Loading preview',
  playing: 'Pause preview',
  error: 'Retry preview',
  paused: 'Resume preview',
  idle: 'Play preview',
};

export interface PreviewButtonState {
  status: PreviewButtonStatus;
  actionLabel: string;
  isActive: boolean;
  isLoading: boolean;
  hasError: boolean;
  handleClick: (event: React.MouseEvent) => void;
}

/** Status, label and click handler shared by the preview play buttons. */
export function usePreviewButtonState(
  track: Partial<AudioPreviewTrack> & { beatmapsetOsuId: number | undefined }
): PreviewButtonState {
  const { state, togglePlayPause } = useAudioPlayer();
  const { beatmapsetOsuId, artist, title, difficulty } = track;

  const isActive =
    Boolean(beatmapsetOsuId) && state.currentlyPlaying === beatmapsetOsuId;
  const isLoading = isActive && state.isLoading;
  const isPlaying = isActive && state.isPlaying && !state.isLoading;
  const hasError = isActive && Boolean(state.error);

  const status: PreviewButtonStatus = isLoading
    ? 'loading'
    : isPlaying
      ? 'playing'
      : hasError
        ? 'error'
        : isActive
          ? 'paused'
          : 'idle';

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      if (beatmapsetOsuId) {
        togglePlayPause({ beatmapsetOsuId, artist, title, difficulty });
      }
    },
    [beatmapsetOsuId, artist, title, difficulty, togglePlayPause]
  );

  return {
    status,
    actionLabel: PREVIEW_ACTION_LABELS[status],
    isActive,
    isLoading,
    hasError,
    handleClick,
  };
}
