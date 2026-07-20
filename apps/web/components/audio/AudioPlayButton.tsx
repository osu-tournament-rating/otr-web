'use client';

import { Loader2, Pause, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAudioPlayer,
  useIsPlaying,
  useIsPreviewActive,
} from '@/lib/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';
import SimpleTooltip from '@/components/simple-tooltip';

const sizeConfig = {
  sm: { button: 'h-6 w-6', icon: 'h-3 w-3' },
  md: { button: 'h-8 w-8', icon: 'h-4 w-4' },
};

interface AudioPlayButtonProps {
  beatmapsetOsuId: number | undefined;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'default';
  className?: string;
  showTooltip?: boolean;
  artist?: string;
  title?: string;
  difficulty?: string;
}

export default function AudioPlayButton({
  beatmapsetOsuId,
  size = 'md',
  variant = 'ghost',
  className,
  showTooltip = true,
  artist,
  title,
  difficulty,
}: AudioPlayButtonProps) {
  const { state, togglePlayPause } = useAudioPlayer();
  const isPlaying = useIsPlaying(beatmapsetOsuId);
  const isActive = useIsPreviewActive(beatmapsetOsuId);
  const isLoading =
    state.isLoading && state.currentlyPlaying === beatmapsetOsuId;
  const hasError =
    Boolean(state.error) && state.currentlyPlaying === beatmapsetOsuId;

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

  const Icon = isLoading
    ? Loader2
    : isPlaying
      ? Pause
      : hasError
        ? RefreshCw
        : Play;
  const actionLabel = isLoading
    ? 'Loading preview'
    : isPlaying
      ? 'Pause preview'
      : hasError
        ? 'Retry preview'
        : isActive
          ? 'Resume preview'
          : 'Play preview';

  const button = (
    <Button
      variant={variant}
      size="icon"
      className={cn(
        sizeConfig[size].button,
        isActive &&
          'ring-1 ring-primary/70 ring-offset-1 ring-offset-background',
        className
      )}
      onClick={handleClick}
      aria-label={actionLabel}
      aria-pressed={isActive && !hasError}
      data-preview-state={
        isLoading
          ? 'loading'
          : isPlaying
            ? 'playing'
            : hasError
              ? 'error'
              : isActive
                ? 'paused'
                : 'idle'
      }
    >
      <Icon
        className={cn(sizeConfig[size].icon, isLoading && 'animate-spin')}
      />
    </Button>
  );

  if (!showTooltip) return button;

  return <SimpleTooltip content={actionLabel}>{button}</SimpleTooltip>;
}
