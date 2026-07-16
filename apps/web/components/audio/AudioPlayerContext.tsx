'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  normalizeAudioPreviewTrack,
  type AudioPreviewSource,
  type AudioPreviewTrack,
} from '@/lib/audio/preview';

const VOLUME_STORAGE_KEY = 'otr-audio-player-volume';
const DEFAULT_VOLUME = 0.25;

function getStoredVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
  if (stored === null) return DEFAULT_VOLUME;
  const parsed = parseFloat(stored);
  return isNaN(parsed) ? DEFAULT_VOLUME : Math.max(0, Math.min(1, parsed));
}

export interface AudioPlayerState {
  currentlyPlaying: number | null;
  currentTrack: AudioPreviewTrack | null;
  volume: number;
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
}

interface AudioPlayerContextType {
  state: AudioPlayerState;
  play: (source: AudioPreviewSource) => void;
  pause: () => void;
  close: () => void;
  togglePlayPause: (source: AudioPreviewSource) => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
}

const initialState: AudioPlayerState = {
  currentlyPlaying: null,
  currentTrack: null,
  volume: DEFAULT_VOLUME,
  isLoading: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  error: null,
};

export const AudioPlayerContext = createContext<AudioPlayerContextType>({
  state: initialState,
  play: () => {},
  pause: () => {},
  close: () => {},
  togglePlayPause: () => {},
  setVolume: () => {},
  seek: () => {},
});

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AudioPlayerState>(() => ({
    ...initialState,
    volume: getStoredVolume(),
  }));

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const storedVolume = getStoredVolume();
    audioRef.current = new Audio();
    audioRef.current.volume = storedVolume;
    setState((previous) => ({ ...previous, volume: storedVolume }));

    const audio = audioRef.current;

    const handleEnded = () => {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        isPlaying: false,
        currentTime: previous.duration,
      }));
    };

    const handleError = () => {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        isPlaying: false,
        error: 'Preview unavailable',
      }));
    };

    const handleCanPlay = () => {
      setState((previous) => ({ ...previous, isLoading: false }));
    };

    const handlePlaying = () => {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        isPlaying: true,
        error: null,
      }));
    };

    const handlePause = () => {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        isPlaying: false,
      }));
    };

    const handleWaiting = () => {
      setState((previous) => ({ ...previous, isLoading: true }));
    };

    const handleTimeUpdate = () => {
      setState((previous) => ({
        ...previous,
        currentTime: audio.currentTime,
      }));
    };

    const handleLoadedMetadata = () => {
      setState((previous) => ({
        ...previous,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      }));
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.pause();
    };
  }, []);

  const play = useCallback(
    (source: AudioPreviewSource) => {
      const audio = audioRef.current;
      if (!audio) return;

      const track = normalizeAudioPreviewTrack(source);
      const isCurrentTrack = state.currentlyPlaying === track.beatmapsetOsuId;

      setState((previous) => ({
        ...previous,
        currentlyPlaying: track.beatmapsetOsuId,
        currentTrack: track,
        isLoading: true,
        error: null,
        ...(!isCurrentTrack
          ? { currentTime: 0, duration: 0, isPlaying: false }
          : {}),
      }));

      if (!isCurrentTrack) {
        audio.src = `https://b.ppy.sh/preview/${track.beatmapsetOsuId}.mp3`;
      }

      void audio.play().catch(() => {
        setState((previous) => ({
          ...previous,
          isLoading: false,
          isPlaying: false,
          error: 'Preview unavailable',
        }));
      });
    },
    [state.currentlyPlaying]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((previous) => ({
      ...previous,
      isLoading: false,
      isPlaying: false,
    }));
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    setState((previous) => ({
      ...initialState,
      volume: previous.volume,
    }));
  }, []);

  const togglePlayPause = useCallback(
    (source: AudioPreviewSource) => {
      const track = normalizeAudioPreviewTrack(source);
      if (
        state.currentlyPlaying === track.beatmapsetOsuId &&
        (state.isPlaying || state.isLoading)
      ) {
        pause();
      } else {
        play(track);
      }
    },
    [state.currentlyPlaying, state.isLoading, state.isPlaying, play, pause]
  );

  const setVolume = useCallback((volume: number) => {
    const safeVolume = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = safeVolume;
    }
    localStorage.setItem(VOLUME_STORAGE_KEY, safeVolume.toString());
    setState((previous) => ({ ...previous, volume: safeVolume }));
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const safeTime = Math.max(
      0,
      Math.min(Number.isFinite(audio.duration) ? audio.duration : time, time)
    );
    audio.currentTime = safeTime;
    setState((previous) => ({ ...previous, currentTime: safeTime }));
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        state,
        play,
        pause,
        close,
        togglePlayPause,
        setVolume,
        seek,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
