'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_PREVIEW_VOLUME,
  clampPreviewVolume,
  normalizeAudioPreviewTrack,
  type AudioPreviewSource,
  type AudioPreviewTrack,
} from '@/lib/audio/preview';

const VOLUME_STORAGE_KEY = 'otr-audio-player-volume';

function getStoredVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_PREVIEW_VOLUME;
  const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
  if (stored === null) return DEFAULT_PREVIEW_VOLUME;

  return clampPreviewVolume(parseFloat(stored));
}

export interface AudioPlayerState {
  currentlyPlaying: number | null;
  currentTrack: AudioPreviewTrack | null;
  volume: number;
  isLoading: boolean;
  isPlaying: boolean;
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
  /**
   * The live element, for readers that need a position sampled per animation
   * frame. `timeupdate` only fires a few times a second, which is enough to
   * label the position but visibly steps a progress bar drawn from it.
   */
  getAudioElement: () => HTMLAudioElement | null;
}

const initialState: AudioPlayerState = {
  currentlyPlaying: null,
  currentTrack: null,
  volume: DEFAULT_PREVIEW_VOLUME,
  isLoading: false,
  isPlaying: false,
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
  getAudioElement: () => null,
});

/**
 * Playback position lives in its own context because timeupdate fires several
 * times per second; only the transport bar subscribes, so a page full of
 * preview buttons does not re-render for the whole duration of playback.
 */
export const AudioPlayerTimeContext = createContext(0);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AudioPlayerState>(initialState);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackAttemptRef = useRef(0);

  useEffect(() => {
    const storedVolume = getStoredVolume();
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = storedVolume;
    setState((previous) => ({ ...previous, volume: storedVolume }));

    const handleEnded = () => {
      setState((previous) => ({
        ...initialState,
        volume: previous.volume,
      }));
      setCurrentTime(0);
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
      setCurrentTime(audio.currentTime);
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
      playbackAttemptRef.current += 1;
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, []);

  const play = useCallback(
    (source: AudioPreviewSource) => {
      const audio = audioRef.current;
      if (!audio) return;

      const track = normalizeAudioPreviewTrack(source);
      const isCurrentTrack = state.currentlyPlaying === track.beatmapsetOsuId;
      const shouldReload = isCurrentTrack && Boolean(state.error);
      const playbackAttempt = ++playbackAttemptRef.current;

      setState((previous) => ({
        ...previous,
        currentlyPlaying: track.beatmapsetOsuId,
        currentTrack: track,
        isLoading: true,
        error: null,
        ...(!isCurrentTrack || shouldReload
          ? { duration: 0, isPlaying: false }
          : {}),
      }));
      if (!isCurrentTrack || shouldReload) {
        setCurrentTime(0);
      }

      if (!isCurrentTrack) {
        audio.src = `https://b.ppy.sh/preview/${track.beatmapsetOsuId}.mp3`;
      } else if (shouldReload) {
        audio.load();
      }

      void audio.play().catch((error: unknown) => {
        if (playbackAttemptRef.current !== playbackAttempt) {
          return;
        }

        setState((previous) => {
          if (previous.currentlyPlaying !== track.beatmapsetOsuId) {
            return previous;
          }

          return {
            ...previous,
            isLoading: false,
            isPlaying: false,
            error:
              error instanceof DOMException && error.name === 'AbortError'
                ? null
                : 'Preview unavailable',
          };
        });
      });
    },
    [state.currentlyPlaying, state.error]
  );

  const pause = useCallback(() => {
    playbackAttemptRef.current += 1;
    audioRef.current?.pause();
    setState((previous) => ({
      ...previous,
      isLoading: false,
      isPlaying: false,
    }));
  }, []);

  const close = useCallback(() => {
    playbackAttemptRef.current += 1;
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
    setCurrentTime(0);
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
    const safeVolume = clampPreviewVolume(volume);
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
    setCurrentTime(safeTime);
  }, []);

  const getAudioElement = useCallback(() => audioRef.current, []);

  const value = useMemo(
    () => ({
      state,
      play,
      pause,
      close,
      togglePlayPause,
      setVolume,
      seek,
      getAudioElement,
    }),
    [
      state,
      play,
      pause,
      close,
      togglePlayPause,
      setVolume,
      seek,
      getAudioElement,
    ]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      <AudioPlayerTimeContext.Provider value={currentTime}>
        {children}
      </AudioPlayerTimeContext.Provider>
    </AudioPlayerContext.Provider>
  );
}
