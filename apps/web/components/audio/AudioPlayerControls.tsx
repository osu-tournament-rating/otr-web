'use client';

import {
  AudioLines,
  Loader2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useRef } from 'react';

import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { formatPreviewTime, getAudioPreviewTitle } from '@/lib/audio/preview';
import { useAudioPlayer } from '@/lib/hooks/useAudioPlayer';

const DEFAULT_UNMUTED_VOLUME = 0.25;

export default function AudioPlayerControls() {
  const { state, pause, play, close, setVolume, seek } = useAudioPlayer();
  const lastAudibleVolume = useRef(
    state.volume > 0 ? state.volume : DEFAULT_UNMUTED_VOLUME
  );

  const track = state.currentTrack;
  if (!track || state.currentlyPlaying === null) return null;

  const isMuted = state.volume === 0;
  const title = getAudioPreviewTitle(track);
  const timelineMaximum = state.duration > 0 ? state.duration : 1;
  const playerState = state.isLoading
    ? 'loading'
    : state.isPlaying
      ? 'playing'
      : 'paused';

  const handleVolumeChange = (value: number[]) => {
    const volume = value[0] / 100;
    if (volume > 0) lastAudibleVolume.current = volume;
    setVolume(volume);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(lastAudibleVolume.current);
    } else {
      lastAudibleVolume.current = state.volume;
      setVolume(0);
    }
  };

  const togglePlayback = () => {
    if (state.isPlaying || state.isLoading) pause();
    else play(track);
  };

  return (
    <>
      <div className="h-36 sm:h-32" aria-hidden="true" />
      <aside
        data-testid="audio-preview-transport"
        data-player-state={playerState}
        aria-label="Audio preview player"
        className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-3xl"
      >
        <div className="relative isolate overflow-hidden rounded-xl border border-primary/25 bg-popover/95 shadow-2xl ring-1 shadow-black/30 ring-black/5 backdrop-blur-xl dark:border-white/15 dark:bg-[#15171c]/95 dark:ring-white/5">
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            <BeatmapCover
              beatmapsetOsuId={track.beatmapsetOsuId}
              alt=""
              sizes="768px"
              className="absolute inset-0 opacity-[0.09] dark:opacity-[0.16]"
              imageClassName="scale-110 blur-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-primary/10 dark:from-[#15171c]/95 dark:via-[#15171c]/90 dark:to-primary/15" />
          </div>

          <div className="relative flex items-center gap-2.5 px-3 pt-3 sm:gap-3 sm:px-4">
            <BeatmapCover
              beatmapsetOsuId={track.beatmapsetOsuId}
              alt={`${title} cover`}
              sizes="64px"
              className="size-12 shrink-0 rounded-md shadow-md sm:size-14"
            />

            <Button
              variant="default"
              size="icon"
              className="size-10 shrink-0 rounded-full shadow-md"
              onClick={togglePlayback}
              aria-label={
                state.isLoading
                  ? 'Pause loading preview'
                  : state.isPlaying
                    ? 'Pause preview'
                    : 'Resume preview'
              }
            >
              {state.isLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : state.isPlaying ? (
                <Pause className="size-4 fill-current" aria-hidden="true" />
              ) : (
                <Play className="size-4 fill-current" aria-hidden="true" />
              )}
            </Button>

            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-[0.14em] text-primary uppercase">
                <AudioLines className="size-3.5" aria-hidden="true" />
                Now previewing
              </p>
              <p className="truncate text-sm font-semibold sm:text-base">
                {title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {state.error ??
                  (track.difficulty
                    ? `[${track.difficulty}]`
                    : 'osu! beatmap preview')}
              </p>
            </div>

            <div className="hidden items-center gap-1 sm:flex">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute preview' : 'Mute preview'}
              >
                {isMuted ? (
                  <VolumeX className="size-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="size-4" aria-hidden="true" />
                )}
              </Button>
              <Slider
                className="w-20 [&_[data-slot=slider-thumb]]:size-3"
                value={[state.volume * 100]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                getThumbProps={() => ({
                  'aria-label': 'Preview volume',
                  'aria-valuetext': `${Math.round(state.volume * 100)} percent`,
                })}
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 self-start sm:self-center"
              onClick={close}
              aria-label="Close audio preview"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="relative mt-2 flex items-center gap-2 border-t border-border/60 bg-background/35 px-3 py-2 sm:gap-3 sm:px-4">
            <span className="w-9 text-right text-[0.7rem] font-medium text-muted-foreground tabular-nums">
              {formatPreviewTime(state.currentTime)}
            </span>
            <Slider
              className="min-w-0 flex-1 [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-track]]:h-1"
              value={[Math.min(state.currentTime, timelineMaximum)]}
              onValueChange={(value) => seek(value[0])}
              max={timelineMaximum}
              step={0.1}
              disabled={state.duration <= 0}
              getThumbProps={() => ({
                'aria-label': 'Preview position',
                'aria-valuetext': `${formatPreviewTime(state.currentTime)} of ${formatPreviewTime(state.duration)}`,
              })}
            />
            <span className="w-9 text-[0.7rem] font-medium text-muted-foreground tabular-nums">
              {formatPreviewTime(state.duration)}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 sm:hidden"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute preview' : 'Mute preview'}
            >
              {isMuted ? (
                <VolumeX className="size-3.5" aria-hidden="true" />
              ) : (
                <Volume2 className="size-3.5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
