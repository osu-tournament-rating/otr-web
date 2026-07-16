'use client';

import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAudioPlayer,
  useIsPlaying,
  useIsPreviewActive,
} from '@/lib/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';

interface AudioPreviewButtonProps {
  beatmapsetOsuId: number | undefined;
  className?: string;
  artist?: string;
  title?: string;
  difficulty?: string;
}

export default function AudioPreviewButton({
  beatmapsetOsuId,
  className,
  artist,
  title,
  difficulty,
}: AudioPreviewButtonProps) {
  const { state, togglePlayPause } = useAudioPlayer();
  const isPlaying = useIsPlaying(beatmapsetOsuId);
  const isActive = useIsPreviewActive(beatmapsetOsuId);
  const isLoading =
    state.isLoading && state.currentlyPlaying === beatmapsetOsuId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (beatmapsetOsuId) {
      togglePlayPause({
        beatmapsetOsuId,
        artist,
        title,
        difficulty,
      });
    }
  };

  if (!beatmapsetOsuId) return null;

  const Icon = isLoading ? Loader2 : isPlaying ? Pause : Play;
  const label = isLoading
    ? 'Loading'
    : isPlaying
      ? 'Pause'
      : isActive
        ? 'Resume'
        : 'Preview';
  const actionLabel = isLoading
    ? 'Loading preview'
    : isPlaying
      ? 'Pause preview'
      : isActive
        ? 'Resume preview'
        : 'Play preview';

  return (
    <Button
      variant="secondary"
      size="sm"
      className={cn('gap-1.5', isActive && 'ring-2 ring-primary/60', className)}
      onClick={handleClick}
      aria-label={actionLabel}
      aria-pressed={isActive}
      data-preview-state={
        isLoading
          ? 'loading'
          : isPlaying
            ? 'playing'
            : isActive
              ? 'paused'
              : 'idle'
      }
    >
      <Icon className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
      {label}
    </Button>
  );
}
