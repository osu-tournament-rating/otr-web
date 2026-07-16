'use client';

import {
  Loader2,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { formatPreviewTime } from '@/lib/audio/preview';
import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';

const DEFAULT_UNMUTED_VOLUME = 0.25;

export default function AudioPlayerControls() {
  const { state, play, pause, close, setVolume, seek } = useAudioPlayer();
  const lastAudibleVolume = useRef(
    state.volume > 0 ? state.volume : DEFAULT_UNMUTED_VOLUME
  );

  useEffect(() => {
    if (state.volume > 0) lastAudibleVolume.current = state.volume;
  }, [state.volume]);

  useEffect(() => {
    if (!state.currentTrack) return;

    document.documentElement.classList.add('audio-transport-visible');
    return () => {
      document.documentElement.classList.remove('audio-transport-visible');
    };
  }, [state.currentTrack]);

  const track = state.currentTrack;
  if (!track || state.currentlyPlaying === null) return null;

  const isMuted = state.volume === 0;
  const title = track.title?.trim() || `Beatmapset #${track.beatmapsetOsuId}`;
  const identity = [track.artist?.trim(), track.difficulty?.trim()]
    .filter(Boolean)
    .join(' · ');
  const currentTime = Math.min(state.currentTime, state.duration || 0);
  const playerState = state.isLoading
    ? 'loading'
    : state.isPlaying
      ? 'playing'
      : 'paused';
  const playLabel = state.isLoading
    ? 'Loading beatmap preview'
    : state.isPlaying
      ? 'Pause beatmap preview'
      : state.error
        ? 'Retry beatmap preview'
        : 'Play beatmap preview';
  const VolumeIcon = isMuted ? VolumeX : state.volume < 0.5 ? Volume1 : Volume2;

  const toggleMute = () => {
    setVolume(isMuted ? lastAudibleVolume.current : 0);
  };

  return (
    <aside
      data-testid="audio-preview-transport"
      data-player-state={playerState}
      aria-label="Beatmap preview player"
      className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-[1050px]"
    >
      <div className="relative overflow-hidden rounded-xl border bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xl dark:bg-popover/95">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-primary"
        />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 py-2.5 pr-11 pl-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(18rem,1.35fr)_8.5rem] sm:items-center sm:gap-4 sm:py-3 sm:pr-12 sm:pl-4">
          <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
            <BeatmapCover
              beatmapsetOsuId={track.beatmapsetOsuId}
              alt=""
              sizes="80px"
              className="h-11 w-16 shrink-0 rounded-md border sm:h-12 sm:w-20"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-wide text-primary uppercase">
                Preview
              </p>
              <p className="truncate text-sm font-semibold">{title}</p>
              <p
                className={cn(
                  'truncate text-xs text-muted-foreground',
                  state.error && 'text-destructive'
                )}
                role={state.error ? 'status' : undefined}
              >
                {state.error || identity || 'osu! beatmap preview'}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              data-testid="audio-transport-play-pause"
              type="button"
              size="icon"
              className="size-9 rounded-full"
              onClick={() =>
                state.isPlaying || state.isLoading ? pause() : play(track)
              }
              aria-label={playLabel}
            >
              {state.isLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : state.isPlaying ? (
                <Pause className="size-4" aria-hidden="true" />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
            </Button>

            <div className="min-w-0 flex-1">
              <Slider
                data-testid="audio-transport-progress"
                value={[currentTime]}
                max={state.duration || 1}
                step={0.1}
                disabled={!state.duration || Boolean(state.error)}
                onValueChange={(value) => seek(value[0])}
                getThumbProps={() => ({
                  'aria-label': 'Preview progress',
                  'aria-valuetext': `${formatPreviewTime(currentTime)} of ${formatPreviewTime(state.duration)}`,
                })}
              />
              <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground tabular-nums">
                <span data-testid="audio-transport-current-time">
                  {formatPreviewTime(currentTime)}
                </span>
                <span data-testid="audio-transport-duration">
                  {formatPreviewTime(state.duration)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute preview' : 'Mute preview'}
            >
              <VolumeIcon className="size-4" aria-hidden="true" />
            </Button>
            <Slider
              data-testid="audio-transport-volume"
              className="w-14 flex-none sm:w-20"
              value={[state.volume * 100]}
              max={100}
              step={1}
              onValueChange={(value) => setVolume(value[0] / 100)}
              getThumbProps={() => ({
                'aria-label': 'Preview volume',
                'aria-valuetext': `${Math.round(state.volume * 100)} percent`,
              })}
            />
          </div>
        </div>

        <Button
          data-testid="audio-transport-close"
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 size-8 text-muted-foreground hover:text-foreground"
          onClick={close}
          aria-label="Close audio preview"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>

        <span className="sr-only" aria-live="polite">
          {state.error ||
            (state.isLoading
              ? `Loading ${title}`
              : state.isPlaying
                ? `Playing ${title}`
                : `${title} paused`)}
        </span>
      </div>
    </aside>
  );
}
