'use client';

import { useContext } from 'react';
import { AudioPlayerContext } from '@/components/audio/AudioPlayerContext';

export function useAudioPlayer() {
  return useContext(AudioPlayerContext);
}

export function useIsPlaying(beatmapsetOsuId: number | undefined): boolean {
  const { state } = useAudioPlayer();
  if (!beatmapsetOsuId) return false;
  return state.currentlyPlaying === beatmapsetOsuId;
}
