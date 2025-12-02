'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface AudioPlayerState {
  currentlyPlaying: number | null;
  volume: number;
  isLoading: boolean;
}

interface AudioPlayerContextType {
  state: AudioPlayerState;
  play: (beatmapsetOsuId: number) => void;
  pause: () => void;
  togglePlayPause: (beatmapsetOsuId: number) => void;
  setVolume: (volume: number) => void;
}

export const AudioPlayerContext = createContext<AudioPlayerContextType>({
  state: { currentlyPlaying: null, volume: 0.35, isLoading: false },
  play: () => {},
  pause: () => {},
  togglePlayPause: () => {},
  setVolume: () => {},
});

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AudioPlayerState>({
    currentlyPlaying: null,
    volume: 0.35,
    isLoading: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = 0.35;

    const audio = audioRef.current;

    const handleEnded = () => {
      setState((prev) => ({ ...prev, currentlyPlaying: null }));
    };

    const handleError = () => {
      setState((prev) => ({
        ...prev,
        currentlyPlaying: null,
        isLoading: false,
      }));
    };

    const handleCanPlay = () => {
      setState((prev) => ({ ...prev, isLoading: false }));
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
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
    setState((prev) => ({ ...prev, currentlyPlaying: null }));
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
    setState((prev) => ({ ...prev, volume }));
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{ state, play, pause, togglePlayPause, setVolume }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
