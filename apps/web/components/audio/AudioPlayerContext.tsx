'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const VOLUME_STORAGE_KEY = 'otr-audio-player-volume';
const DEFAULT_VOLUME = 0.25;

function getStoredVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
  if (stored === null) return DEFAULT_VOLUME;
  const parsed = parseFloat(stored);
  return isNaN(parsed) ? DEFAULT_VOLUME : Math.max(0, Math.min(1, parsed));
}

interface AudioPlayerState {
  currentlyPlaying: number | null;
  volume: number;
  isLoading: boolean;
  currentTime: number;
  duration: number;
}

interface AudioPlayerContextType {
  state: AudioPlayerState;
  play: (beatmapsetOsuId: number) => void;
  pause: () => void;
  togglePlayPause: (beatmapsetOsuId: number) => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
}

export const AudioPlayerContext = createContext<AudioPlayerContextType>({
  state: {
    currentlyPlaying: null,
    volume: 0.25,
    isLoading: false,
    currentTime: 0,
    duration: 0,
  },
  play: () => {},
  pause: () => {},
  togglePlayPause: () => {},
  setVolume: () => {},
  seek: () => {},
});

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AudioPlayerState>(() => ({
    currentlyPlaying: null,
    volume: getStoredVolume(),
    isLoading: false,
    currentTime: 0,
    duration: 0,
  }));

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const storedVolume = getStoredVolume();
    audioRef.current = new Audio();
    audioRef.current.volume = storedVolume;
    setState((prev) => ({ ...prev, volume: storedVolume }));

    const audio = audioRef.current;

    const handleEnded = () => {
      setState((prev) => ({
        ...prev,
        currentlyPlaying: null,
        currentTime: 0,
        duration: 0,
      }));
    };

    const handleError = () => {
      setState((prev) => ({
        ...prev,
        currentlyPlaying: null,
        isLoading: false,
        currentTime: 0,
        duration: 0,
      }));
    };

    const handleCanPlay = () => {
      setState((prev) => ({ ...prev, isLoading: false }));
    };

    const handleTimeUpdate = () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleLoadedMetadata = () => {
      setState((prev) => ({ ...prev, duration: audio.duration }));
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.pause();
    };
  }, []);

  const play = useCallback(
    (beatmapsetOsuId: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      const url = `https://b.ppy.sh/preview/${beatmapsetOsuId}.mp3`;

      if (state.currentlyPlaying === beatmapsetOsuId && audio.paused) {
        audio.play();
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        currentlyPlaying: beatmapsetOsuId,
      }));
      audio.src = url;
      audio.play().catch(() => {
        setState((prev) => ({
          ...prev,
          currentlyPlaying: null,
          isLoading: false,
        }));
      });
    },
    [state.currentlyPlaying]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((prev) => ({
      ...prev,
      currentlyPlaying: null,
      currentTime: 0,
      duration: 0,
    }));
  }, []);

  const togglePlayPause = useCallback(
    (beatmapsetOsuId: number) => {
      if (state.currentlyPlaying === beatmapsetOsuId) {
        pause();
      } else {
        play(beatmapsetOsuId);
      }
    },
    [state.currentlyPlaying, play, pause]
  );

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    localStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
    setState((prev) => ({ ...prev, volume }));
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{ state, play, pause, togglePlayPause, setVolume, seek }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
